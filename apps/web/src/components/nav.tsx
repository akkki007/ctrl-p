"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { signOut, useSession } from "../lib/auth-client";
import { useCart } from "../lib/cart";

const ADMIN_EMAILS = new Set(
  (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
);

export function Nav() {
  const { data, isPending } = useSession();
  const { count } = useCart();
  const router = useRouter();

  const user = data?.user;
  const isAdmin = user?.email ? ADMIN_EMAILS.has(user.email.toLowerCase()) : false;

  const [unread, setUnread] = useState(0);
  useEffect(() => {
    if (!user) {
      setUnread(0);
      return;
    }
    api
      .getNotifications()
      .then((f) => setUnread(f.unread))
      .catch(() => setUnread(0));
  }, [user]);

  async function handleSignOut() {
    await signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-accent font-mono text-sm text-accent-fg">
            ^p
          </span>
          <span>ctrlp</span>
        </Link>

        <div className="flex items-center gap-1 text-sm sm:gap-2">
          <NavLink href="/wall">Wall</NavLink>
          <NavLink href="/create">Create</NavLink>
          {user && <NavLink href="/studio">Studio</NavLink>}
          {user && <NavLink href="/rewards">Rewards</NavLink>}
          {user && <NavLink href="/orders">Orders</NavLink>}
          {isAdmin && <NavLink href="/admin">Admin</NavLink>}

          {user && (
            <Link
              href="/notifications"
              className="relative rounded-md px-2 py-1.5 font-medium hover:bg-border/50"
              aria-label="Notifications"
            >
              🔔
              {unread > 0 && (
                <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-semibold text-accent-fg">
                  {unread}
                </span>
              )}
            </Link>
          )}

          <Link
            href="/cart"
            className="relative rounded-md px-3 py-1.5 font-medium hover:bg-border/50"
          >
            Cart
            {count > 0 && (
              <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-xs font-semibold text-accent-fg">
                {count}
              </span>
            )}
          </Link>

          {isPending ? (
            <div className="h-8 w-16 animate-pulse rounded-md bg-border/60" />
          ) : user ? (
            <button
              onClick={handleSignOut}
              className="rounded-md border border-border px-3 py-1.5 font-medium hover:bg-border/50"
            >
              Sign out
            </button>
          ) : (
            <Link
              href="/sign-in"
              className="rounded-md bg-accent px-3 py-1.5 font-medium text-accent-fg hover:opacity-90"
            >
              Sign in
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="rounded-md px-3 py-1.5 font-medium hover:bg-border/50">
      {children}
    </Link>
  );
}
