"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_TRANSITIONS,
  type OrderDetail,
  type OrderStatus,
  formatPaise,
} from "@ctrlp/shared";
import { OrderTimeline, StatusBadge } from "../../../../components/order-status";
import { api, ApiError } from "../../../../lib/api";

export default function AdminOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    if (!params.id) return;
    api
      .adminGetOrder(params.id)
      .then(setOrder)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load order"));
  }, [params.id]);

  useEffect(load, [load]);

  async function advance(to: OrderStatus) {
    if (!order) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await api.adminUpdateStatus(order.id, { status: to, note: note || undefined });
      setOrder(updated);
      setNote("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update status");
    } finally {
      setBusy(false);
    }
  }

  async function downloadPrintFile(itemId: string) {
    if (!order) return;
    try {
      const { url } = await api.adminPrintFile(order.id, itemId);
      window.open(url, "_blank", "noopener");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to get print file");
    }
  }

  if (error && !order) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="mb-4 text-muted">{error}</p>
        <Link href="/admin" className="font-medium text-accent hover:underline">
          ← Back to queue
        </Link>
      </div>
    );
  }
  if (!order) return <div className="mx-auto max-w-3xl px-4 py-16 text-muted">Loading…</div>;

  const nextStatuses = ORDER_STATUS_TRANSITIONS[order.status];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Link href="/admin" className="text-sm text-muted hover:underline">
        ← Queue
      </Link>

      <div className="mt-3 mb-8 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Order #{order.id.slice(0, 8)}</h1>
        <StatusBadge status={order.status} />
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-8">
          <section className="rounded-xl border border-border bg-card p-6">
            <h2 className="mb-4 font-semibold">Advance status</h2>
            {order.paymentStatus !== "paid" ? (
              <p className="text-sm text-muted">
                Order is <strong>{order.paymentStatus}</strong> — fulfilment is locked until
                payment clears.
              </p>
            ) : nextStatuses.length === 0 ? (
              <p className="text-sm text-muted">This order has reached a final state.</p>
            ) : (
              <div className="flex flex-col gap-3">
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Optional note (e.g. courier, QC remark)"
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
                />
                <div className="flex flex-wrap gap-2">
                  {nextStatuses.map((s) => (
                    <button
                      key={s}
                      disabled={busy}
                      onClick={() => advance(s)}
                      className={`rounded-md px-3 py-1.5 text-sm font-medium transition disabled:opacity-50 ${
                        s === "cancelled"
                          ? "border border-red-500/40 text-red-600 hover:bg-red-500/10 dark:text-red-400"
                          : "bg-accent text-accent-fg hover:opacity-90"
                      }`}
                    >
                      → {ORDER_STATUS_LABELS[s]}
                    </button>
                  ))}
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
              </div>
            )}
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-semibold">Items</h2>
            {order.items.map((item) => (
              <div key={item.id} className="flex gap-4 rounded-xl border border-border bg-card p-4">
                {item.previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.previewUrl} alt="" className="h-20 w-20 rounded-md object-cover" />
                ) : (
                  <div className="h-20 w-20 rounded-md bg-border" />
                )}
                <div className="flex-1">
                  <p className="font-medium">
                    {item.size} · {item.material} · {item.frameStyle}
                  </p>
                  <p className="text-sm text-muted">Qty {item.quantity}</p>
                  <button
                    onClick={() => downloadPrintFile(item.id)}
                    className="mt-2 text-sm font-medium text-accent hover:underline"
                  >
                    Download print file ↗
                  </button>
                </div>
              </div>
            ))}
          </section>

          <section className="rounded-xl border border-border bg-card p-6">
            <h2 className="mb-4 font-semibold">History</h2>
            <OrderTimeline status={order.status} history={order.history} />
          </section>
        </div>

        <div className="flex flex-col gap-6">
          <section className="rounded-xl border border-border bg-card p-5 text-sm">
            <h2 className="mb-3 font-semibold">Ship to</h2>
            <p className="font-medium">{order.shippingAddress.fullName}</p>
            <p className="text-muted">{order.shippingAddress.line1}</p>
            {order.shippingAddress.line2 && (
              <p className="text-muted">{order.shippingAddress.line2}</p>
            )}
            <p className="text-muted">
              {order.shippingAddress.city}, {order.shippingAddress.state}{" "}
              {order.shippingAddress.pincode}
            </p>
            {order.shippingAddress.landmark && (
              <p className="text-muted">Landmark: {order.shippingAddress.landmark}</p>
            )}
            <p className="mt-1 text-muted">{order.shippingAddress.phone}</p>
          </section>

          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-3 font-semibold">Totals</h2>
            <div className="flex items-center justify-between text-sm text-muted">
              <span>Subtotal</span>
              <span>{formatPaise(order.subtotalPaise)}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-muted">
              <span>Delivery</span>
              <span>
                {order.deliveryFeePaise === 0 ? "Free" : formatPaise(order.deliveryFeePaise)}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-border pt-2 font-semibold">
              <span>Total</span>
              <span>{formatPaise(order.totalPaise)}</span>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
