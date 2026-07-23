"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { type AnalyticsDashboard, formatPaise } from "@ctrlp/shared";
import { AdminTabs } from "../../../components/admin-tabs";
import { api, ApiError } from "../../../lib/api";

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .adminAnalytics()
      .then(setData)
      .catch((err) =>
        setError(
          err instanceof ApiError && err.status === 403
            ? "You don't have admin access."
            : "Failed to load analytics.",
        ),
      );
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="mb-6 text-3xl font-semibold tracking-tight">Admin</h1>
      <AdminTabs />

      {error && <p className="text-sm text-red-500">{error}</p>}
      {!data && !error && <p className="text-muted">Loading…</p>}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <Kpi label="Revenue (paid)" value={formatPaise(data.kpis.revenuePaise)} />
            <Kpi label="Paid orders" value={String(data.kpis.paidOrders)} />
            <Kpi label="Avg order value" value={formatPaise(data.kpis.avgOrderValuePaise)} />
            <Kpi
              label="Wall order share"
              value={`${Math.round(data.kpis.wallOrderShare * 100)}%`}
            />
            <Kpi label="Customers" value={String(data.kpis.totalCustomers)} />
            <Kpi
              label="Repeat rate"
              value={
                data.kpis.totalCustomers
                  ? `${Math.round((data.kpis.repeatCustomers / data.kpis.totalCustomers) * 100)}%`
                  : "0%"
              }
            />
            <Kpi label="Published designs" value={String(data.kpis.publishedDesigns)} />
            <Kpi label="Total orders" value={String(data.kpis.totalOrders)} />
          </div>

          <RevenueChart points={data.revenueByDay} />

          <div className="mt-8 grid gap-8 lg:grid-cols-2">
            <section>
              <h2 className="mb-3 font-semibold">Best-selling designs</h2>
              {data.bestSellers.length === 0 ? (
                <p className="text-sm text-muted">No sales yet.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {data.bestSellers.map((d) => (
                    <Link
                      key={d.id}
                      href={`/wall/${d.id}`}
                      className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 hover:border-accent/50"
                    >
                      {d.previewUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={d.previewUrl} alt="" className="h-10 w-10 rounded object-cover" />
                      ) : (
                        <div className="h-10 w-10 rounded bg-border" />
                      )}
                      <span className="flex-1 truncate">{d.title}</span>
                      <span className="text-sm font-medium text-muted">{d.orderCount} sold</span>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 className="mb-3 font-semibold">Creator leaderboard</h2>
              {data.leaderboard.length === 0 ? (
                <p className="text-sm text-muted">No creator earnings yet.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {data.leaderboard.map((c, i) => (
                    <div
                      key={c.handle || i}
                      className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
                    >
                      <span className="w-5 text-center font-mono text-muted">{i + 1}</span>
                      <div className="flex-1">
                        <p className="font-medium">{c.displayName}</p>
                        <p className="text-xs text-muted">{c.designsSold} sold</p>
                      </div>
                      <span className="font-medium">{formatPaise(c.earningsPaise)}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function RevenueChart({ points }: { points: AnalyticsDashboard["revenueByDay"] }) {
  const max = Math.max(1, ...points.map((p) => p.revenuePaise));
  return (
    <section className="mt-8 rounded-xl border border-border bg-card p-5">
      <h2 className="mb-4 font-semibold">Revenue · last {points.length} days</h2>
      <div className="flex h-40 items-end gap-1">
        {points.map((p) => (
          <div key={p.date} className="group flex flex-1 flex-col items-center justify-end">
            <div
              className="w-full rounded-t bg-accent/70 transition group-hover:bg-accent"
              style={{ height: `${Math.max(2, (p.revenuePaise / max) * 100)}%` }}
              title={`${p.date}: ${formatPaise(p.revenuePaise)} · ${p.orders} orders`}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-xs text-muted">
        <span>{points[0]?.date}</span>
        <span>{points[points.length - 1]?.date}</span>
      </div>
    </section>
  );
}
