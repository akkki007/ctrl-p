"use client";

import { useCallback, useEffect, useState } from "react";
import type { HubView } from "@ctrlp/shared";
import { AdminTabs } from "../../../components/admin-tabs";
import { api, ApiError } from "../../../lib/api";

export default function AdminHubsPage() {
  const [hubs, setHubs] = useState<HubView[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api
      .adminListHubs()
      .then(setHubs)
      .catch((err) =>
        setError(
          err instanceof ApiError && err.status === 403
            ? "You don't have admin access."
            : "Failed to load hubs.",
        ),
      );
  }, []);

  useEffect(load, [load]);

  async function toggle(h: HubView) {
    await api.adminUpdateHub(h.id, { active: !h.active }).catch(() => undefined);
    load();
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="mb-6 text-3xl font-semibold tracking-tight">Admin</h1>
      <AdminTabs />

      {error && <p className="mb-4 text-sm text-red-500">{error}</p>}

      <NewHubForm onCreated={load} />

      <div className="mt-8 flex flex-col gap-2">
        {hubs?.map((h) => (
          <div key={h.id} className="flex items-center gap-4 rounded-lg border border-border bg-card p-4">
            <div className="flex-1">
              <p className="font-medium">
                {h.name} · {h.city}
              </p>
              <p className="text-sm text-muted">
                {h.pincodePrefixes.length} PIN prefixes · {h.orderCount} orders
              </p>
              <p className="mt-1 truncate text-xs text-muted">{h.pincodePrefixes.join(", ")}</p>
            </div>
            <button
              onClick={() => toggle(h)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                h.active ? "border border-border hover:bg-border/40" : "bg-accent text-accent-fg"
              }`}
            >
              {h.active ? "Deactivate" : "Activate"}
            </button>
          </div>
        ))}
        {hubs && hubs.length === 0 && (
          <p className="text-muted">No hubs yet — add one so orders can be placed.</p>
        )}
      </div>
    </div>
  );
}

function NewHubForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [prefixes, setPrefixes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function create() {
    setError(null);
    const pincodePrefixes = prefixes
      .split(",")
      .map((p) => p.trim())
      .filter((p) => /^\d{3}$/.test(p));
    if (!name.trim() || !city.trim() || pincodePrefixes.length === 0) {
      setError("Enter a name, city, and at least one 3-digit PIN prefix.");
      return;
    }
    setBusy(true);
    try {
      await api.adminCreateHub({ name: name.trim(), city: city.trim(), pincodePrefixes, active: true });
      setName("");
      setCity("");
      setPrefixes("");
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create hub");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="mb-3 font-semibold">New fulfilment hub</h2>
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Pune Studio"
            className="w-40 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </Field>
        <Field label="City">
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Pune"
            className="w-32 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </Field>
        <Field label="PIN prefixes (3-digit, comma-separated)">
          <input
            value={prefixes}
            onChange={(e) => setPrefixes(e.target.value)}
            placeholder="411, 412, 413"
            className="w-64 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </Field>
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
