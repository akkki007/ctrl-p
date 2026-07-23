"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  type LoyaltyView,
  MIN_PAYOUT_PAISE,
  type PayoutRequestView,
  type ReferralView,
  type WalletView,
  formatPaise,
} from "@ctrlp/shared";
import { api, ApiError } from "../../lib/api";
import { useSession } from "../../lib/auth-client";

export default function RewardsPage() {
  const { data, isPending } = useSession();
  const [loyalty, setLoyalty] = useState<LoyaltyView | null>(null);
  const [wallet, setWallet] = useState<WalletView | null>(null);
  const [payouts, setPayouts] = useState<PayoutRequestView[]>([]);
  const [referral, setReferral] = useState<ReferralView | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    Promise.all([api.getLoyalty(), api.getWallet(), api.getPayouts(), api.getReferral()])
      .then(([l, w, p, r]) => {
        setLoyalty(l);
        setWallet(w);
        setPayouts(p);
        setReferral(r);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load rewards"));
  }, []);

  useEffect(() => {
    if (isPending || !data?.user) return;
    load();
  }, [isPending, data?.user, load]);

  if (!isPending && !data?.user) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
        <h1 className="mb-2 text-2xl font-semibold">Sign in to see your rewards</h1>
        <Link
          href="/sign-in?next=/rewards"
          className="mt-2 rounded-full bg-accent px-6 py-3 font-medium text-accent-fg"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="mb-8 text-3xl font-semibold tracking-tight">Rewards</h1>
      {error && <p className="mb-6 text-sm text-red-500">{error}</p>}

      <div className="grid gap-6 sm:grid-cols-2">
        {/* Loyalty */}
        <section className="rounded-xl border border-border bg-card p-6">
          <p className="text-sm text-muted">Loyalty points</p>
          <p className="text-3xl font-semibold">{loyalty?.balance ?? "…"}</p>
          <p className="mt-1 text-xs text-muted">Redeem at checkout — 1 point = ₹1.</p>
          {loyalty && loyalty.transactions.length > 0 && (
            <ul className="mt-4 flex flex-col gap-2 border-t border-border pt-3 text-sm">
              {loyalty.transactions.slice(0, 6).map((t) => (
                <li key={t.id} className="flex justify-between">
                  <span className="text-muted">{t.description}</span>
                  <span className={t.points >= 0 ? "text-green-600 dark:text-green-400" : ""}>
                    {t.points >= 0 ? "+" : ""}
                    {t.points}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Wallet + payout */}
        <section className="rounded-xl border border-border bg-card p-6">
          <p className="text-sm text-muted">Creator wallet</p>
          <p className="text-3xl font-semibold">
            {wallet ? formatPaise(wallet.balancePaise) : "…"}
          </p>
          {wallet && (
            <PayoutSection
              balancePaise={wallet.balancePaise}
              payouts={payouts}
              onDone={load}
            />
          )}
        </section>
      </div>

      {/* Referral */}
      <section className="mt-6 rounded-xl border border-border bg-card p-6">
        <h2 className="mb-2 font-semibold">Refer friends</h2>
        {referral ? (
          <ReferralSection referral={referral} onClaimed={load} />
        ) : (
          <p className="text-muted">Loading…</p>
        )}
      </section>
    </div>
  );
}

function PayoutSection({
  balancePaise,
  payouts,
  onDone,
}: {
  balancePaise: number;
  payouts: PayoutRequestView[];
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [upiId, setUpiId] = useState("");
  const [panLast4, setPanLast4] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const eligible = balancePaise >= MIN_PAYOUT_PAISE;

  async function submit() {
    setError(null);
    const amountPaise = Math.round(Number(amount) * 100);
    if (!Number.isFinite(amountPaise) || amountPaise < MIN_PAYOUT_PAISE) {
      setError(`Minimum payout is ₹${MIN_PAYOUT_PAISE / 100}.`);
      return;
    }
    setBusy(true);
    try {
      await api.requestPayout({ amountPaise, upiId, panLast4: panLast4 || undefined });
      setOpen(false);
      setAmount("");
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Payout request failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3">
      {eligible ? (
        <button
          onClick={() => setOpen((o) => !o)}
          className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-fg"
        >
          Request payout
        </button>
      ) : (
        <p className="text-xs text-muted">
          Reach {formatPaise(MIN_PAYOUT_PAISE)} to request a cash payout via UPI.
        </p>
      )}

      {open && (
        <div className="mt-3 flex flex-col gap-2">
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount (₹)"
            inputMode="decimal"
            className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <input
            value={upiId}
            onChange={(e) => setUpiId(e.target.value)}
            placeholder="UPI ID (name@bank)"
            className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <input
            value={panLast4}
            onChange={(e) => setPanLast4(e.target.value)}
            placeholder="PAN last 4 (KYC)"
            maxLength={4}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            onClick={submit}
            disabled={busy}
            className="self-start rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-fg disabled:opacity-50"
          >
            {busy ? "Submitting…" : "Submit request"}
          </button>
        </div>
      )}

      {payouts.length > 0 && (
        <ul className="mt-4 flex flex-col gap-2 border-t border-border pt-3 text-sm">
          {payouts.slice(0, 5).map((p) => (
            <li key={p.id} className="flex justify-between">
              <span className="text-muted">
                {new Date(p.createdAt).toLocaleDateString()} → {p.upiId}
              </span>
              <span className="capitalize">
                {formatPaise(p.amountPaise)} · {p.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ReferralSection({
  referral,
  onClaimed,
}: {
  referral: ReferralView;
  onClaimed: () => void;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function claim() {
    setError(null);
    try {
      await api.claimReferral(code.trim());
      onClaimed();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not claim code");
    }
  }

  return (
    <div>
      <p className="text-sm text-muted">
        Share your code — you and your friend each get {referral.pointsPerReferral} points when
        they place their first order.
      </p>
      <div className="mt-3 flex items-center gap-3">
        <code className="rounded-md bg-border/50 px-3 py-2 font-mono text-lg tracking-widest">
          {referral.code}
        </code>
        <button
          onClick={() => {
            navigator.clipboard?.writeText(referral.code);
            setCopied(true);
          }}
          className="text-sm font-medium text-accent hover:underline"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <p className="mt-2 text-xs text-muted">
        {referral.referredCount} referred · {referral.rewardedCount} rewarded
      </p>

      {referral.referredBy ? (
        <p className="mt-4 text-sm text-muted">Referred by {referral.referredBy}. Bonus applied on your first order.</p>
      ) : (
        <div className="mt-4 border-t border-border pt-4">
          <p className="mb-2 text-sm font-medium">Got a code from a friend?</p>
          <div className="flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="FRIEND CODE"
              className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm uppercase outline-none focus:border-accent"
            />
            <button
              onClick={claim}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-border/40"
            >
              Apply
            </button>
          </div>
          {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
        </div>
      )}
    </div>
  );
}
