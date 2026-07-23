"use client";

import { useCallback, useEffect, useState } from "react";
import {
  type CouponType,
  type CouponView,
  type CreateCouponInput,
  formatPaise,
} from "@ctrlp/shared";
import { AdminTabs } from "../../../components/admin-tabs";
import { api, ApiError } from "../../../lib/api";

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<CouponView[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api
      .adminListCoupons()
      .then(setCoupons)
      .catch((err) =>
        setError(
          err instanceof ApiError && err.status === 403
            ? "You don't have admin access."
            : "Failed to load coupons.",
        ),
      );
  }, []);

  useEffect(load, [load]);

  async function toggle(id: string, active: boolean) {
    await api.adminSetCouponActive(id, active).catch(() => undefined);
    load();
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="mb-6 text-3xl font-semibold tracking-tight">Admin</h1>
      <AdminTabs />

      {error && <p className="mb-4 text-sm text-red-500">{error}</p>}

      <NewCouponForm onCreated={load} />

      <div className="mt-8 flex flex-col gap-2">
        {coupons?.map((c) => (
          <div key={c.id} className="flex items-center gap-4 rounded-lg border border-border bg-card p-4">
            <div className="flex-1">
              <p className="font-mono font-medium">
                {c.code}{" "}
                {c.autoApply && (
                  <span className="ml-1 rounded-full bg-accent/10 px-2 py-0.5 text-xs text-accent">
                    deal
                  </span>
                )}
              </p>
              <p className="text-sm text-muted">
                {c.type === "percent" ? `${c.value}% off` : `${formatPaise(c.value)} off`}
                {c.maxDiscountPaise ? ` (max ${formatPaise(c.maxDiscountPaise)})` : ""}
                {c.minSubtotalPaise ? ` · min ${formatPaise(c.minSubtotalPaise)}` : ""} ·{" "}
                {c.timesRedeemed} used
              </p>
            </div>
            <button
              onClick={() => toggle(c.id, !c.active)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                c.active
                  ? "border border-border hover:bg-border/40"
                  : "bg-accent text-accent-fg"
              }`}
            >
              {c.active ? "Deactivate" : "Activate"}
            </button>
          </div>
        ))}
        {coupons && coupons.length === 0 && <p className="text-muted">No coupons yet.</p>}
      </div>
    </div>
  );
}

function NewCouponForm({ onCreated }: { onCreated: () => void }) {
  const [code, setCode] = useState("");
  const [type, setType] = useState<CouponType>("percent");
  const [value, setValue] = useState("");
  const [minSubtotal, setMinSubtotal] = useState("");
  const [autoApply, setAutoApply] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function create() {
    setError(null);
    const numValue = Number(value);
    if (!code.trim() || !Number.isFinite(numValue) || numValue <= 0) {
      setError("Enter a code and a positive value.");
      return;
    }
    const body: CreateCouponInput = {
      code: code.trim().toUpperCase(),
      type,
      // percent → whole percent; flat → rupees converted to paise
      value: type === "percent" ? Math.round(numValue) : Math.round(numValue * 100),
      minSubtotalPaise: minSubtotal ? Math.round(Number(minSubtotal) * 100) : 0,
      perUserLimit: 1,
      autoApply,
      active: true,
    };

    setBusy(true);
    try {
      await api.adminCreateCoupon(body);
      setCode("");
      setValue("");
      setMinSubtotal("");
      setAutoApply(false);
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create coupon");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="mb-3 font-semibold">New coupon</h2>
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Code">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="DIWALI20"
            className="w-32 rounded-md border border-border bg-background px-3 py-2 text-sm uppercase outline-none focus:border-accent"
          />
        </Field>
        <Field label="Type">
          <select
            value={type}
            onChange={(e) => setType(e.target.value as CouponType)}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          >
            <option value="percent">Percent</option>
            <option value="flat">Flat (₹)</option>
          </select>
        </Field>
        <Field label={type === "percent" ? "Percent" : "Amount (₹)"}>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-24 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </Field>
        <Field label="Min order (₹)">
          <input
            value={minSubtotal}
            onChange={(e) => setMinSubtotal(e.target.value)}
            className="w-24 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={autoApply} onChange={(e) => setAutoApply(e.target.checked)} />
          Show as deal
        </label>
        <button
          onClick={create}
          disabled={busy}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-fg disabled:opacity-50"
        >
          {busy ? "Creating…" : "Create"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-muted">
      {label}
      {children}
    </label>
  );
}
