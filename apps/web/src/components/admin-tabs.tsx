"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin", label: "Orders" },
  { href: "/admin/moderation", label: "Moderation" },
  { href: "/admin/reports", label: "Reports" },
];

export function AdminTabs() {
  const pathname = usePathname();
  return (
    <div className="mb-6 flex gap-1 border-b border-border">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition ${
              active
                ? "border-accent text-accent"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
