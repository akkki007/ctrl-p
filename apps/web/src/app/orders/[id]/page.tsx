"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  type FrameStyle,
  type Material,
  type OrderDetail,
  formatPaise,
} from "@ctrlp/shared";
import { OrderTimeline, StatusBadge } from "../../../components/order-status";
import { api, ApiError } from "../../../lib/api";

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

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params.id) return;
    api
      .getOrder(params.id)
      .then(setOrder)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load order"));
  }, [params.id]);

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="mb-4 text-muted">{error}</p>
        <Link href="/orders" className="font-medium text-accent hover:underline">
          ← Back to orders
        </Link>
      </div>
    );
  }

  if (!order) {
    return <div className="mx-auto max-w-3xl px-4 py-16 text-muted">Loading…</div>;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Link href="/orders" className="text-sm text-muted hover:underline">
        ← All orders
      </Link>

      <div className="mt-3 mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Order #{order.id.slice(0, 8)}
          </h1>
          <p className="text-sm text-muted">
            Placed {new Date(order.createdAt).toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {order.paymentStatus !== "paid" && (
            <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-300">
              Payment {order.paymentStatus}
            </span>
          )}
          <StatusBadge status={order.status} />
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-8">
          <section className="rounded-xl border border-border bg-card p-6">
            <h2 className="mb-5 font-semibold">Tracking</h2>
            <OrderTimeline status={order.status} history={order.history} />
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-semibold">Items</h2>
            {order.items.map((item) => (
              <div
                key={item.id}
                className="flex gap-4 rounded-xl border border-border bg-card p-4"
              >
                {item.previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.previewUrl}
                    alt=""
                    className="h-20 w-20 rounded-md object-cover"
                  />
                ) : (
                  <div className="h-20 w-20 rounded-md bg-border" />
                )}
                <div className="flex-1">
                  <p className="font-medium">{item.size}</p>
                  <p className="text-sm text-muted">
                    {MATERIAL_LABELS[item.material]} · {FRAME_LABELS[item.frameStyle]}
                  </p>
                  <p className="text-sm text-muted">Qty {item.quantity}</p>
                </div>
                <p className="font-medium">
                  {formatPaise(item.unitPricePaise * item.quantity)}
                </p>
              </div>
            ))}
          </section>
        </div>

        <div className="flex flex-col gap-6">
          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-3 font-semibold">Summary</h2>
            <SummaryRow label="Subtotal" value={formatPaise(order.subtotalPaise)} />
            {order.couponDiscountPaise > 0 && (
              <SummaryRow
                label={order.couponCode ? `Coupon (${order.couponCode})` : "Coupon"}
                value={`−${formatPaise(order.couponDiscountPaise)}`}
              />
            )}
            {order.pointsDiscountPaise > 0 && (
              <SummaryRow
                label={`Points (${order.pointsRedeemed})`}
                value={`−${formatPaise(order.pointsDiscountPaise)}`}
              />
            )}
            <SummaryRow
              label="Delivery"
              value={order.deliveryFeePaise === 0 ? "Free" : formatPaise(order.deliveryFeePaise)}
            />
            <div className="mt-3 flex items-center justify-between border-t border-border pt-3 font-semibold">
              <span>Total</span>
              <span>{formatPaise(order.totalPaise)}</span>
            </div>
            {order.pointsEarned > 0 && (
              <p className="mt-3 rounded-md bg-accent/10 px-3 py-2 text-sm text-accent">
                You earned {order.pointsEarned} loyalty points on this order.
              </p>
            )}
          </section>

          <section className="rounded-xl border border-border bg-card p-5 text-sm">
            <h2 className="mb-3 font-semibold">Delivery to</h2>
            <p className="font-medium">{order.shippingAddress.fullName}</p>
            <p className="text-muted">{order.shippingAddress.line1}</p>
            {order.shippingAddress.line2 && (
              <p className="text-muted">{order.shippingAddress.line2}</p>
            )}
            <p className="text-muted">
              {order.shippingAddress.city}, {order.shippingAddress.state}{" "}
              {order.shippingAddress.pincode}
            </p>
            <p className="text-muted">{order.shippingAddress.phone}</p>
          </section>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm text-muted">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
