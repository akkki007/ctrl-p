"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  type DesignStatus,
  type MyDesign,
  type WalletView,
  formatPaise,
} from "@ctrlp/shared";
import { api, ApiError } from "../../lib/api";
import { useSession } from "../../lib/auth-client";

const STATUS_STYLE: Record<DesignStatus, string> = {
  pending: "bg-amber-500/15 text-amber-600 dark:text-amber-300",
  approved: "bg-green-500/15 text-green-600 dark:text-green-300",
  rejected: "bg-red-500/15 text-red-600 dark:text-red-300",
  removed: "bg-zinc-500/15 text-zinc-500 dark:text-zinc-400",
};

export default function StudioPage() {
  const { data, isPending } = useSession();
  const [designs, setDesigns] = useState<MyDesign[] | null>(null);
  const [wallet, setWallet] = useState<WalletView | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    Promise.all([api.myDesigns(), api.getWallet()])
      .then(([d, w]) => {
        setDesigns(d);
        setWallet(w);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load studio"));
  }, []);

  useEffect(() => {
    if (isPending || !data?.user) return;
    load();
  }, [isPending, data?.user, load]);

  async function unpublish(id: string) {
    await api.unpublishDesign(id).catch(() => undefined);
    load();
  }

  if (!isPending && !data?.user) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
        <h1 className="mb-2 text-2xl font-semibold">Sign in to open your studio</h1>
        <Link
          href="/sign-in?next=/studio"
          className="mt-2 rounded-full bg-accent px-6 py-3 font-medium text-accent-fg"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="mb-8 text-3xl font-semibold tracking-tight">Creator studio</h1>
      {error && <p className="mb-6 text-sm text-red-500">{error}</p>}

      <section className="mb-10 rounded-xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-muted">Wallet balance</p>
            <p className="text-3xl font-semibold">
              {wallet ? formatPaise(wallet.balancePaise) : "…"}
            </p>
          </div>
          <p className="max-w-xs text-right text-xs text-muted">
            Earned from Wall orders. Cash payouts arrive in Phase 3.
          </p>
        </div>

        {wallet && wallet.transactions.length > 0 && (
          <div className="mt-5 border-t border-border pt-4">
            <p className="mb-2 text-sm font-medium">Recent activity</p>
            <ul className="flex flex-col gap-2">
              {wallet.transactions.slice(0, 8).map((t) => (
                <li key={t.id} className="flex items-center justify-between text-sm">
                  <span className="text-muted">
                    {new Date(t.createdAt).toLocaleDateString()} · {t.description}
                  </span>
                  <span
                    className={t.amountPaise >= 0 ? "text-green-600 dark:text-green-400" : ""}
                  >
                    {t.amountPaise >= 0 ? "+" : ""}
                    {formatPaise(t.amountPaise)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Your designs</h2>
        <Link href="/create" className="text-sm font-medium text-accent hover:underline">
          + Publish a new design
        </Link>
      </div>

      {designs && designs.length === 0 && (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-muted">
          You haven&apos;t published anything yet. Upload an image and toggle{" "}
          <em>Publish to the Wall</em> to get started.
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {designs?.map((d) => (
          <div key={d.id} className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="aspect-square bg-border/40">
              {d.previewUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={d.previewUrl} alt={d.title} className="h-full w-full object-cover" />
              )}
            </div>
            <div className="p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate font-medium">{d.title}</p>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[d.status]}`}
                >
                  {d.status}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted">{d.orderCount} orders</p>
              {d.status === "rejected" && d.rejectionReason && (
                <p className="mt-1 text-xs text-red-500">Reason: {d.rejectionReason}</p>
              )}
              {(d.status === "approved" || d.status === "pending") && (
                <button
                  onClick={() => unpublish(d.id)}
                  className="mt-2 text-xs text-muted hover:text-red-500"
                >
                  Take down
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
