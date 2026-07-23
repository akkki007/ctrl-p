"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { type OrderSummary, formatPaise } from "@ctrlp/shared";
import { StatusBadge } from "../../components/order-status";
import { api, ApiError } from "../../lib/api";
import { useSession } from "../../lib/auth-client";

export default function OrdersPage() {
  const { data, isPending } = useSession();
  const [orders, setOrders] = useState<OrderSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isPending || !data?.user) return;
    api
      .listOrders()
      .then(setOrders)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load orders"));
  }, [isPending, data?.user]);

  if (!isPending && !data?.user) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
        <h1 className="mb-2 text-2xl font-semibold">Sign in to see your orders</h1>
        <Link
          href="/sign-in?next=/orders"
          className="mt-2 rounded-full bg-accent px-6 py-3 font-medium text-accent-fg"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="mb-8 text-3xl font-semibold tracking-tight">Your orders</h1>

      {error && <p className="text-sm text-red-500">{error}</p>}
      {!orders && !error && <p className="text-muted">Loading…</p>}
      {orders && orders.length === 0 && (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <p className="mb-4 text-muted">You haven&apos;t placed any orders yet.</p>
          <Link href="/create" className="font-medium text-accent hover:underline">
            Create your first print →
          </Link>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {orders?.map((order) => (
          <Link
            key={order.id}
            href={`/orders/${order.id}`}
            className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition hover:border-accent/50"
          >
            {order.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={order.thumbnailUrl}
                alt=""
                className="h-16 w-16 rounded-md object-cover"
              />
            ) : (
              <div className="h-16 w-16 rounded-md bg-border" />
            )}
            <div className="flex-1">
              <p className="font-medium">
                {order.itemCount} item{order.itemCount === 1 ? "" : "s"}
              </p>
              <p className="text-sm text-muted">
                {new Date(order.createdAt).toLocaleDateString()} · {formatPaise(order.totalPaise)}
              </p>
            </div>
            <StatusBadge status={order.status} />
          </Link>
        ))}
      </div>
    </div>
  );
}
