"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { NotificationFeed } from "@ctrlp/shared";
import { api, ApiError } from "../../lib/api";
import { useSession } from "../../lib/auth-client";

export default function NotificationsPage() {
  const { data, isPending } = useSession();
  const [feed, setFeed] = useState<NotificationFeed | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api
      .getNotifications()
      .then(setFeed)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load"));
  }, []);

  useEffect(() => {
    if (isPending || !data?.user) return;
    load();
  }, [isPending, data?.user, load]);

  async function markAll() {
    await api.markNotificationsRead().catch(() => undefined);
    load();
  }

  if (!isPending && !data?.user) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
        <h1 className="mb-2 text-2xl font-semibold">Sign in to see notifications</h1>
        <Link
          href="/sign-in?next=/notifications"
          className="mt-2 rounded-full bg-accent px-6 py-3 font-medium text-accent-fg"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-semibold tracking-tight">Notifications</h1>
        {feed && feed.unread > 0 && (
          <button onClick={markAll} className="text-sm font-medium text-accent hover:underline">
            Mark all read
          </button>
        )}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}
      {feed && feed.items.length === 0 && (
        <p className="text-muted">Nothing yet — order updates and rewards will show up here.</p>
      )}

      <div className="flex flex-col gap-2">
        {feed?.items.map((n) => (
          <div
            key={n.id}
            className={`rounded-xl border p-4 ${
              n.read ? "border-border bg-card" : "border-accent/40 bg-accent/5"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium">{n.title}</p>
              {!n.read && <span className="h-2 w-2 rounded-full bg-accent" aria-label="unread" />}
            </div>
            <p className="text-sm text-muted">{n.body}</p>
            <p className="mt-1 text-xs text-muted">{new Date(n.createdAt).toLocaleString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
