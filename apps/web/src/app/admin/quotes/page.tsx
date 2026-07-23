"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BULK_QUOTE_STATUSES,
  type BulkQuoteStatus,
  type BulkQuoteView,
  formatPaise,
} from "@ctrlp/shared";
import { AdminTabs } from "../../../components/admin-tabs";
import { api, ApiError } from "../../../lib/api";

export default function AdminQuotesPage() {
  const [status, setStatus] = useState<BulkQuoteStatus | "all">("new");
  const [quotes, setQuotes] = useState<BulkQuoteView[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setQuotes(null);
    api
      .adminListQuotes(status === "all" ? undefined : status)
      .then(setQuotes)
      .catch((err) =>
        setError(
          err instanceof ApiError && err.status === 403
            ? "You don't have admin access."
            : "Failed to load quotes.",
        ),
      );
  }, [status]);

  useEffect(load, [load]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="mb-6 text-3xl font-semibold tracking-tight">Admin</h1>
      <AdminTabs />

      <div className="mb-6 flex flex-wrap gap-2">
        {(["all", ...BULK_QUOTE_STATUSES] as const).map((s) => (
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
      {!quotes && !error && <p className="text-muted">Loading…</p>}
      {quotes && quotes.length === 0 && <p className="text-muted">No quotes here.</p>}

      <div className="flex flex-col gap-3">
        {quotes?.map((q) => (
          <QuoteRow key={q.id} quote={q} onChanged={load} />
        ))}
      </div>
    </div>
  );
}

function QuoteRow({ quote, onChanged }: { quote: BulkQuoteView; onChanged: () => void }) {
  const [amount, setAmount] = useState(
    quote.quotedPaise != null ? String(quote.quotedPaise / 100) : "",
  );
  const [busy, setBusy] = useState(false);

  async function update(patch: Parameters<typeof api.adminUpdateQuote>[1]) {
    setBusy(true);
    try {
      await api.adminUpdateQuote(quote.id, patch);
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium">
            {quote.company} · {quote.quantity} units
          </p>
          <p className="text-sm text-muted">
            {quote.contactName} · {quote.email}
            {quote.phone ? ` · ${quote.phone}` : ""}
          </p>
          {quote.details && <p className="mt-1 text-sm text-muted">“{quote.details}”</p>}
        </div>
        <span className="rounded-full bg-border/50 px-2.5 py-0.5 text-xs font-medium capitalize">
          {quote.status}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Quote (₹)"
          className="w-28 rounded-md border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-accent"
        />
        <button
          disabled={busy}
          onClick={() =>
            update({ status: "quoted", quotedPaise: Math.round(Number(amount) * 100) })
          }
          className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-fg disabled:opacity-50"
        >
          Send quote
        </button>
        <button
          disabled={busy}
          onClick={() => update({ status: "won" })}
          className="rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-border/40 disabled:opacity-50"
        >
          Won
        </button>
        <button
          disabled={busy}
          onClick={() => update({ status: "lost" })}
          className="rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-border/40 disabled:opacity-50"
        >
          Lost
        </button>
        {quote.quotedPaise != null && (
          <span className="text-sm text-muted">Quoted {formatPaise(quote.quotedPaise)}</span>
        )}
      </div>
    </div>
  );
}
