"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  type CouponPreview,
  type FrameStyle,
  LOYALTY_POINT_VALUE_PAISE,
  type Material,
  type ShippingAddress,
  computeOrderTotals,
  formatPaise,
  maxRedeemablePoints,
  pointsValuePaise,
  shippingAddressSchema,
} from "@ctrlp/shared";
import { api, ApiError } from "../../lib/api";
import { useSession } from "../../lib/auth-client";
import { type CartItem, useCart } from "../../lib/cart";
import { runCheckout } from "../../lib/razorpay";

const MATERIAL_LABELS: Record<Material, string> = {
  matte: "Matte",
  glossy: "Glossy",
  canvas: "Canvas",
};
const FRAME_LABELS: Record<FrameStyle, string> = {
  none: "No frame",
  black: "Black frame",
  white: "White frame",
  "natural-wood": "Natural wood frame",
};

const EMPTY_ADDRESS: ShippingAddress = {
  fullName: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  pincode: "",
  landmark: "",
};

export default function CartPage() {
  const { data, isPending } = useSession();
  const cart = useCart();
  const router = useRouter();

  const [address, setAddress] = useState<ShippingAddress>(EMPTY_ADDRESS);
  const [error, setError] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);

  // Delivery serviceability
  const [service, setService] = useState<{ ok: boolean; city: string | null } | null>(null);

  // Discounts
  const [pointsBalance, setPointsBalance] = useState(0);
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<CouponPreview | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);

  const subtotalPaise = cart.totals.subtotalPaise;
  const deliveryFeePaise = cart.totals.deliveryFeePaise;
  const couponDiscountPaise = coupon?.discountPaise ?? 0;
  const maxPoints = maxRedeemablePoints(subtotalPaise, pointsBalance);
  const pointsDiscountPaise = Math.min(
    pointsValuePaise(Math.min(pointsToRedeem, maxPoints)),
    Math.max(0, subtotalPaise - couponDiscountPaise),
  );
  const totals = computeOrderTotals({
    subtotalPaise,
    deliveryFeePaise,
    couponDiscountPaise,
    pointsDiscountPaise,
  });

  useEffect(() => {
    if (isPending || !data?.user) return;
    api
      .getLoyalty()
      .then((l) => setPointsBalance(l.balance))
      .catch(() => setPointsBalance(0));
  }, [isPending, data?.user]);

  // Check delivery serviceability once a full PIN code is entered.
  useEffect(() => {
    if (!/^\d{6}$/.test(address.pincode)) {
      setService(null);
      return;
    }
    let active = true;
    api
      .checkDelivery(address.pincode)
      .then((r) => active && setService({ ok: r.serviceable, city: r.city }))
      .catch(() => active && setService(null));
    return () => {
      active = false;
    };
  }, [address.pincode]);

  async function applyCoupon() {
    setCouponError(null);
    if (!couponInput.trim()) return;
    try {
      const preview = await api.previewCoupon(couponInput.trim(), subtotalPaise);
      setCoupon(preview);
    } catch (err) {
      setCoupon(null);
      setCouponError(err instanceof ApiError ? err.message : "Invalid coupon");
    }
  }

  async function handleCheckout() {
    setError(null);

    const parsed = shippingAddressSchema.safeParse(address);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please complete the delivery address.");
      return;
    }

    setPlacing(true);
    try {
      const order = await api.createOrder({
        items: cart.items.map((i) => ({
          assetId: i.assetId,
          wallDesignId: i.wallDesignId,
          size: i.size,
          material: i.material,
          frameStyle: i.frameStyle,
          quantity: i.quantity,
        })),
        shippingAddress: parsed.data,
        couponCode: coupon?.code,
        pointsToRedeem: Math.min(pointsToRedeem, maxPoints),
      });

      const handshake = await runCheckout(order, {
        name: parsed.data.fullName,
        email: data?.user?.email,
        phone: parsed.data.phone,
      });

      await api.verifyPayment(order.orderId, handshake);
      cart.clear();
      router.push(`/orders/${order.orderId}`);
    } catch (err) {
      if (err instanceof Error && err.message === "Payment cancelled") {
        setError("Payment cancelled — your cart is still here.");
      } else if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : "Checkout failed.");
      }
    } finally {
      setPlacing(false);
    }
  }

  if (!isPending && !data?.user) {
    return (
      <Centered>
        <h1 className="mb-2 text-2xl font-semibold">Sign in to check out</h1>
        <Link
          href="/sign-in?next=/cart"
          className="mt-2 rounded-full bg-accent px-6 py-3 font-medium text-accent-fg"
        >
          Sign in
        </Link>
      </Centered>
    );
  }

  if (cart.items.length === 0) {
    return (
      <Centered>
        <h1 className="mb-2 text-2xl font-semibold">Your cart is empty</h1>
        <p className="mb-6 text-muted">Design your first print to get started.</p>
        <Link href="/create" className="rounded-full bg-accent px-6 py-3 font-medium text-accent-fg">
          Create a print
        </Link>
      </Centered>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="mb-8 text-3xl font-semibold tracking-tight">Your cart</h1>

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="flex flex-col gap-4">
          {cart.items.map((item) => (
            <CartRow key={item.key} item={item} />
          ))}
        </div>

        <div className="flex flex-col gap-6">
          <AddressForm address={address} onChange={setAddress} />

          {service && (
            <p
              className={`-mt-2 rounded-md px-3 py-2 text-sm ${
                service.ok
                  ? "bg-green-500/10 text-green-700 dark:text-green-300"
                  : "bg-red-500/10 text-red-600 dark:text-red-400"
              }`}
            >
              {service.ok
                ? `✓ Delivers from our ${service.city} hub`
                : "We don't deliver to this PIN code yet."}
            </p>
          )}

          {/* Coupon */}
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="mb-2 text-sm font-medium">Coupon</p>
            {coupon ? (
              <div className="flex items-center justify-between rounded-md bg-green-500/10 px-3 py-2 text-sm">
                <span className="font-medium text-green-700 dark:text-green-300">
                  {coupon.code} · −{formatPaise(coupon.discountPaise)}
                </span>
                <button
                  onClick={() => {
                    setCoupon(null);
                    setCouponInput("");
                  }}
                  className="text-muted hover:text-red-500"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  placeholder="Enter code"
                  className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm uppercase outline-none focus:border-accent"
                />
                <button
                  onClick={applyCoupon}
                  className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-border/40"
                >
                  Apply
                </button>
              </div>
            )}
            {couponError && <p className="mt-2 text-sm text-red-500">{couponError}</p>}
          </div>

          {/* Loyalty points */}
          {pointsBalance > 0 && (
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-medium">Redeem points</p>
                <span className="text-xs text-muted">{pointsBalance} available</span>
              </div>
              {maxPoints > 0 ? (
                <>
                  <input
                    type="range"
                    min={0}
                    max={maxPoints}
                    value={Math.min(pointsToRedeem, maxPoints)}
                    onChange={(e) => setPointsToRedeem(Number(e.target.value))}
                    className="w-full accent-[var(--accent)]"
                  />
                  <p className="mt-1 text-sm text-muted">
                    Using {Math.min(pointsToRedeem, maxPoints)} points ·{" "}
                    <span className="text-foreground">−{formatPaise(pointsDiscountPaise)}</span>
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted">
                  Add more to your cart to redeem points (worth ₹
                  {LOYALTY_POINT_VALUE_PAISE / 100} each).
                </p>
              )}
            </div>
          )}

          <div className="rounded-xl border border-border bg-card p-5">
            <Row label="Subtotal" value={formatPaise(totals.subtotalPaise)} />
            {couponDiscountPaise > 0 && (
              <Row label={`Coupon (${coupon?.code})`} value={`−${formatPaise(couponDiscountPaise)}`} />
            )}
            {pointsDiscountPaise > 0 && (
              <Row label="Points" value={`−${formatPaise(pointsDiscountPaise)}`} />
            )}
            <Row
              label="Delivery"
              value={totals.deliveryFeePaise === 0 ? "Free" : formatPaise(totals.deliveryFeePaise)}
            />
            <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-lg font-semibold">
              <span>Total</span>
              <span>{formatPaise(totals.totalPaise)}</span>
            </div>

            {error && (
              <p className="mt-4 rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
                {error}
              </p>
            )}

            <button
              onClick={handleCheckout}
              disabled={placing}
              className="mt-4 w-full rounded-full bg-accent px-6 py-3 font-medium text-accent-fg transition hover:opacity-90 disabled:opacity-50"
            >
              {placing ? "Processing…" : `Pay ${formatPaise(totals.totalPaise)}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CartRow({ item }: { item: CartItem }) {
  const cart = useCart();
  return (
    <div className="flex gap-4 rounded-xl border border-border bg-card p-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={item.previewUrl}
        alt={item.fileName}
        className="h-24 w-24 flex-shrink-0 rounded-md object-cover"
      />
      <div className="flex flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-medium">{item.size}</p>
            <p className="text-sm text-muted">
              {MATERIAL_LABELS[item.material]} · {FRAME_LABELS[item.frameStyle]}
            </p>
          </div>
          <button
            onClick={() => cart.remove(item.key)}
            className="text-sm text-muted hover:text-red-500"
          >
            Remove
          </button>
        </div>
        <div className="mt-auto flex items-center gap-2">
          <div className="flex items-center rounded-md border border-border text-sm">
            <button
              onClick={() => cart.setQuantity(item.key, item.quantity - 1)}
              className="px-2.5 py-1 hover:bg-border/40"
              aria-label="Decrease"
            >
              −
            </button>
            <span className="w-8 text-center">{item.quantity}</span>
            <button
              onClick={() => cart.setQuantity(item.key, item.quantity + 1)}
              className="px-2.5 py-1 hover:bg-border/40"
              aria-label="Increase"
            >
              +
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AddressForm({
  address,
  onChange,
}: {
  address: ShippingAddress;
  onChange: (a: ShippingAddress) => void;
}) {
  const set = (key: keyof ShippingAddress) => (v: string) => onChange({ ...address, [key]: v });
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="mb-4 font-semibold">Delivery address</h2>
      <div className="grid grid-cols-2 gap-3">
        <Input className="col-span-2" label="Full name" value={address.fullName} onChange={set("fullName")} />
        <Input className="col-span-2" label="Phone" value={address.phone} onChange={set("phone")} placeholder="10-digit mobile" />
        <Input className="col-span-2" label="Address line 1" value={address.line1} onChange={set("line1")} />
        <Input className="col-span-2" label="Address line 2 (optional)" value={address.line2 ?? ""} onChange={set("line2")} />
        <Input label="City" value={address.city} onChange={set("city")} />
        <Input label="State" value={address.state} onChange={set("state")} />
        <Input label="PIN code" value={address.pincode} onChange={set("pincode")} />
        <Input label="Landmark (optional)" value={address.landmark ?? ""} onChange={set("landmark")} />
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  className = "",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  className?: string;
  placeholder?: string;
}) {
  return (
    <label className={`flex flex-col gap-1 text-sm ${className}`}>
      <span className="text-muted">{label}</span>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-accent"
      />
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm text-muted">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
      {children}
    </div>
  );
}
