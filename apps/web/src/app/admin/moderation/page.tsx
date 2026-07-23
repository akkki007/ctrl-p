"use client";

import { useCallback, useEffect, useState } from "react";
import {
  type AdminDesignSummary,
  DESIGN_STATUSES,
  type DesignStatus,
} from "@ctrlp/shared";
import { AdminTabs } from "../../../components/admin-tabs";
import { api, ApiError } from "../../../lib/api";

export default function ModerationPage() {
  const [status, setStatus] = useState<DesignStatus>("pending");
  const [designs, setDesigns] = useState<AdminDesignSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    setDesigns(null);
    setError(null);
    api
      .adminListDesigns(status)
      .then(setDesigns)
      .catch((err) =>
        setError(
          err instanceof ApiError && err.status === 403
            ? "You don't have admin access."
            : "Failed to load designs.",
        ),
      );
  }, [status]);

  useEffect(load, [load]);

  async function moderate(id: string, action: "approve" | "reject") {
    let reason: string | undefined;
    if (action === "reject") {
      reason = window.prompt("Reason for rejection?") ?? undefined;
      if (!reason) return;
    }
    setBusyId(id);
    try {
      await api.adminModerate(id, { action, reason });
      setDesigns((prev) => prev?.filter((d) => d.id !== id) ?? null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Action failed.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="mb-6 text-3xl font-semibold tracking-tight">Admin</h1>
      <AdminTabs />

      <div className="mb-6 flex flex-wrap gap-2">
        {DESIGN_STATUSES.map((s) => (
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
      {!designs && !error && <p className="text-muted">Loading…</p>}
      {designs && designs.length === 0 && <p className="text-muted">Nothing here.</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {designs?.map((d) => (
          <div key={d.id} className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="aspect-square bg-border/40">
              {d.previewUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={d.previewUrl} alt={d.title} className="h-full w-full object-cover" />
              )}
            </div>
            <div className="p-4">
              <p className="font-medium">{d.title}</p>
              <p className="text-sm capitalize text-muted">{d.category}</p>
              <p className="mt-1 text-xs text-muted">
                by {d.creator.displayName} (@{d.creator.handle})
              </p>
              {d.tags.length > 0 && (
                <p className="mt-1 text-xs text-muted">{d.tags.map((t) => `#${t}`).join(" ")}</p>
              )}

              {status === "pending" && (
                <div className="mt-3 flex gap-2">
                  <button
                    disabled={busyId === d.id}
                    onClick={() => moderate(d.id, "approve")}
                    className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-fg disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    disabled={busyId === d.id}
                    onClick={() => moderate(d.id, "reject")}
                    className="rounded-md border border-red-500/40 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-500/10 disabled:opacity-50 dark:text-red-400"
                  >
                    Reject
                  </button>
                </div>
              )}
              {d.status === "rejected" && d.rejectionReason && (
                <p className="mt-2 text-xs text-red-500">Reason: {d.rejectionReason}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
