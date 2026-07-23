"use client";

import { useState } from "react";

/** Web Share where available, clipboard copy as the fallback. */
export function ShareButton({ title, text }: { title: string; text?: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (navigator.share) {
      await navigator.share({ title, text, url }).catch(() => {});
      return;
    }
    await navigator.clipboard?.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      onClick={share}
      className="rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-border/40"
    >
      {copied ? "Link copied!" : "Share"}
    </button>
  );
}
