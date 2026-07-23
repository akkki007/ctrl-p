"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  type AdminOrderSummary,
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  type OrderStatus,
  formatPaise,
} from "@ctrlp/shared";
import { AdminTabs } from "../../components/admin-tabs";
import { StatusBadge } from "../../components/order-status";
import { api, ApiError } from "../../lib/api";

export default function AdminPage() {
  const [filter, setFilter] = useState<OrderStatus | "all">("all");
  const [orders, setOrders] = useState<AdminOrderSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setOrders(null);
    setError(null);
    api
      .adminListOrders(filter === "all" ? undefined : filter)
      .then(setOrders)
      .catch((err) =>
        setError(
          err instanceof ApiError && err.status === 403
            ? "You don't have admin access."
            : "Failed to load the order queue.",
        ),
      );
  }, [filter]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="mb-6 text-3xl font-semibold tracking-tight">Admin</h1>
      <AdminTabs />

      <div className="mb-6 flex flex-wrap gap-2">
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
          All
        </FilterChip>
        {ORDER_STATUSES.map((s) => (
          <FilterChip key={s} active={filter === s} onClick={() => setFilter(s)}>
            {ORDER_STATUS_LABELS[s]}
          </FilterChip>
        ))}
      </div>

      {error && (
        <p className="rounded-md bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      {!orders && !error && <p className="text-muted">Loading…</p>}
      {orders && orders.length === 0 && <p className="text-muted">No orders in this view.</p>}

      <div className="flex flex-col gap-2">
        {orders?.map((order) => (
          <Link
            key={order.id}
            href={`/admin/orders/${order.id}`}
            className="flex items-center gap-4 rounded-lg border border-border bg-card p-4 transition hover:border-accent/50"
          >
            {order.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={order.thumbnailUrl} alt="" className="h-12 w-12 rounded object-cover" />
            ) : (
              <div className="h-12 w-12 rounded bg-border" />
            )}
            <div className="flex-1">
              <p className="font-medium">
                #{order.id.slice(0, 8)} · {order.customerName || order.customerEmail}
              </p>
              <p className="text-sm text-muted">
                {order.itemCount} item{order.itemCount === 1 ? "" : "s"} ·{" "}
                {formatPaise(order.totalPaise)} ·{" "}
                {new Date(order.createdAt).toLocaleDateString()}
              </p>
            </div>
            {order.paymentStatus !== "paid" && (
              <span className="text-xs text-amber-600 dark:text-amber-300">unpaid</span>
            )}
            <StatusBadge status={order.status} />
          </Link>
        ))}
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-sm transition ${
        active ? "border-accent bg-accent/10 text-accent" : "border-border hover:bg-border/40"
      }`}
    >
      {children}
    </button>
  );
}
