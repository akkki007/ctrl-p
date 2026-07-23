"use client";

import { useState } from "react";
import { createBulkQuoteSchema } from "@ctrlp/shared";
import { api, ApiError } from "../../lib/api";

const PERKS = [
  { title: "Cafés & restaurants", body: "Curated wall sets that match your interior." },
  { title: "Offices", body: "Branded prints and team-photo walls at volume pricing." },
  { title: "Gifting", body: "Bulk framed gifts for events, clients, and milestones." },
];

export default function BusinessPage() {
  const [form, setForm] = useState({
    company: "",
    contactName: "",
    email: "",
    phone: "",
    quantity: "",
    details: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function submit() {
    setError(null);
    const parsed = createBulkQuoteSchema.safeParse({
      company: form.company,
      contactName: form.contactName,
      email: form.email,
      phone: form.phone || undefined,
      quantity: Number(form.quantity),
      details: form.details || undefined,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please complete the form.");
      return;
    }
    setBusy(true);
    try {
      await api.createBulkQuote(parsed.data);
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Submission failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <div className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Bulk & business orders</h1>
        <p className="mx-auto mt-3 max-w-xl text-muted">
          Volume pricing, dedicated production, and delivery across our hubs. Tell us what you need
          and we&apos;ll send a quote.
        </p>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {PERKS.map((p) => (
          <div key={p.title} className="rounded-xl border border-border bg-card p-5">
            <h3 className="mb-1 font-semibold">{p.title}</h3>
            <p className="text-sm text-muted">{p.body}</p>
          </div>
        ))}
      </div>

      <div className="mx-auto mt-10 max-w-xl rounded-xl border border-border bg-card p-6">
        {done ? (
          <div className="text-center">
            <h2 className="mb-2 text-xl font-semibold">Thanks — we&apos;ll be in touch 🎉</h2>
            <p className="text-muted">Our team will email you a quote shortly.</p>
          </div>
        ) : (
          <>
            <h2 className="mb-4 font-semibold">Request a quote</h2>
            <div className="grid grid-cols-2 gap-3">
              <Input className="col-span-2" label="Company" value={form.company} onChange={set("company")} />
              <Input label="Your name" value={form.contactName} onChange={set("contactName")} />
              <Input label="Email" value={form.email} onChange={set("email")} />
              <Input label="Phone (optional)" value={form.phone} onChange={set("phone")} />
              <Input label="Quantity" value={form.quantity} onChange={set("quantity")} placeholder="e.g. 50" />
              <label className="col-span-2 flex flex-col gap-1 text-sm">
                <span className="text-muted">Details (optional)</span>
                <textarea
                  value={form.details}
                  onChange={(e) => set("details")(e.target.value)}
                  rows={3}
                  className="rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-accent"
                />
              </label>
            </div>
            {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
            <button
              onClick={submit}
              disabled={busy}
              className="mt-4 w-full rounded-full bg-accent px-6 py-3 font-medium text-accent-fg transition hover:opacity-90 disabled:opacity-50"
            >
              {busy ? "Submitting…" : "Request quote"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  className = "",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  className?: string;
  placeholder?: string;
}) {
  return (
    <label className={`flex flex-col gap-1 text-sm ${className}`}>
      <span className="text-muted">{label}</span>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-accent"
      />
    </label>
  );
}
