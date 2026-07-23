"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  type AdminReportView,
  REPORT_STATUSES,
  type ReportStatus,
} from "@ctrlp/shared";
import { AdminTabs } from "../../../components/admin-tabs";
import { api, ApiError } from "../../../lib/api";

export default function ReportsPage() {
  const [status, setStatus] = useState<ReportStatus>("open");
  const [reports, setReports] = useState<AdminReportView[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    setReports(null);
    setError(null);
    api
      .adminListReports(status)
      .then(setReports)
      .catch((err) =>
        setError(
          err instanceof ApiError && err.status === 403
            ? "You don't have admin access."
            : "Failed to load reports.",
        ),
      );
  }, [status]);

  useEffect(load, [load]);

  async function resolve(id: string, action: "uphold" | "dismiss") {
    setBusyId(id);
    try {
      await api.adminResolveReport(id, { action });
      setReports((prev) => prev?.filter((r) => r.id !== id) ?? null);
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
        {REPORT_STATUSES.map((s) => (
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
      {!reports && !error && <p className="text-muted">Loading…</p>}
      {reports && reports.length === 0 && <p className="text-muted">No reports here.</p>}

      <div className="flex flex-col gap-3">
        {reports?.map((r) => (
          <div key={r.id} className="flex gap-4 rounded-xl border border-border bg-card p-4">
            <Link href={`/wall/${r.design.id}`} className="flex-shrink-0">
              {r.design.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={r.design.previewUrl}
                  alt=""
                  className="h-20 w-20 rounded-md object-cover"
                />
              ) : (
                <div className="h-20 w-20 rounded-md bg-border" />
              )}
            </Link>
            <div className="flex-1">
              <p className="font-medium">{r.design.title}</p>
              <p className="text-sm capitalize text-muted">
                {r.reason.replace(/-/g, " ")} · design is {r.design.status}
              </p>
              {r.details && <p className="mt-1 text-sm text-muted">“{r.details}”</p>}
              <p className="mt-1 text-xs text-muted">
                {new Date(r.createdAt).toLocaleString()}
              </p>

              {status === "open" && (
                <div className="mt-3 flex gap-2">
                  <button
                    disabled={busyId === r.id}
                    onClick={() => resolve(r.id, "uphold")}
                    className="rounded-md border border-red-500/40 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-500/10 disabled:opacity-50 dark:text-red-400"
                  >
                    Uphold &amp; take down
                  </button>
                  <button
                    disabled={busyId === r.id}
                    onClick={() => resolve(r.id, "dismiss")}
                    className="rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-border/40 disabled:opacity-50"
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
