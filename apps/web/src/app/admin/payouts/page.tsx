"use client";

import { useCallback, useEffect, useState } from "react";
import {
  type AdminPayoutView,
  PAYOUT_STATUSES,
  type PayoutStatus,
  formatPaise,
} from "@ctrlp/shared";
import { AdminTabs } from "../../../components/admin-tabs";
import { api, ApiError } from "../../../lib/api";

export default function AdminPayoutsPage() {
  const [status, setStatus] = useState<PayoutStatus | "all">("requested");
  const [payouts, setPayouts] = useState<AdminPayoutView[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    setPayouts(null);
    setError(null);
    api
      .adminListPayouts(status === "all" ? undefined : status)
      .then(setPayouts)
      .catch((err) =>
        setError(
          err instanceof ApiError && err.status === 403
            ? "You don't have admin access."
            : "Failed to load payouts.",
        ),
      );
  }, [status]);

  useEffect(load, [load]);

  async function process(id: string, action: "approve" | "pay" | "reject") {
    setBusyId(id);
    try {
      await api.adminProcessPayout(id, { action });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Action failed.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="mb-6 text-3xl font-semibold tracking-tight">Admin</h1>
      <AdminTabs />

      <div className="mb-6 flex flex-wrap gap-2">
        {(["all", ...PAYOUT_STATUSES] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`rounded-full border px-3 py-1 text-sm capitalize transition ${
              status === s ? "border-accent bg-accent/10 text-accent" : "border-border hover:bg-border/40"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}
      {!payouts && !error && <p className="text-muted">Loading…</p>}
      {payouts && payouts.length === 0 && <p className="text-muted">No payouts here.</p>}

      <div className="flex flex-col gap-3">
        {payouts?.map((p) => (
          <div key={p.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium">
                  {formatPaise(p.amountPaise)} → {p.upiId}
                </p>
                <p className="text-sm text-muted">
                  {p.customerName || p.customerEmail}
                  {p.panLast4 ? ` · PAN ••••${p.panLast4}` : ""} ·{" "}
                  {new Date(p.createdAt).toLocaleDateString()}
                </p>
              </div>
              <span className="rounded-full bg-border/50 px-2.5 py-0.5 text-xs font-medium capitalize">
                {p.status}
              </span>
            </div>

            {(p.status === "requested" || p.status === "approved") && (
              <div className="mt-3 flex gap-2">
                {p.status === "requested" && (
                  <button
                    disabled={busyId === p.id}
                    onClick={() => process(p.id, "approve")}
                    className="rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-border/40 disabled:opacity-50"
                  >
                    Approve
                  </button>
                )}
                <button
                  disabled={busyId === p.id}
                  onClick={() => process(p.id, "pay")}
                  className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-fg disabled:opacity-50"
                >
                  Mark paid
                </button>
                <button
                  disabled={busyId === p.id}
                  onClick={() => process(p.id, "reject")}
                  className="rounded-md border border-red-500/40 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-500/10 disabled:opacity-50 dark:text-red-400"
                >
                  Reject
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
