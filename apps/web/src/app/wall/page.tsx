"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { WALL_CATEGORIES, type WallCategory, type WallPage } from "@ctrlp/shared";
import { api, ApiError } from "../../lib/api";

const PAGE_SIZE = 24;

export default function WallGalleryPage() {
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<WallCategory | "all">("all");
  const [sort, setSort] = useState<"newest" | "popular">("newest");
  const [page, setPage] = useState(1);

  const [data, setData] = useState<WallPage | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setData(null);
    setError(null);
    api
      .listWall({
        q: search || undefined,
        category: category === "all" ? undefined : category,
        sort,
        page,
        pageSize: PAGE_SIZE,
      })
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load the Wall"));
  }, [search, category, sort, page]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Wall of Frames</h1>
          <p className="text-muted">Order a design from the community — the creator earns on every print.</p>
        </div>
        <select
          value={sort}
          onChange={(e) => {
            setSort(e.target.value as "newest" | "popular");
            setPage(1);
          }}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
        >
          <option value="newest">Newest</option>
          <option value="popular">Most popular</option>
        </select>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setSearch(q);
        }}
        className="mt-4 flex gap-2"
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search designs by title…"
          className="flex-1 rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-accent"
        />
        <button className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-fg">
          Search
        </button>
      </form>

      <div className="mt-4 flex flex-wrap gap-2">
        <Chip active={category === "all"} onClick={() => { setCategory("all"); setPage(1); }}>
          All
        </Chip>
        {WALL_CATEGORIES.map((c) => (
          <Chip
            key={c}
            active={category === c}
            onClick={() => {
              setCategory(c);
              setPage(1);
            }}
          >
            {c}
          </Chip>
        ))}
      </div>

      {error && <p className="mt-8 text-sm text-red-500">{error}</p>}
      {!data && !error && <p className="mt-8 text-muted">Loading…</p>}
      {data && data.items.length === 0 && (
        <p className="mt-8 text-muted">No designs match your filters yet.</p>
      )}

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {data?.items.map((d) => (
          <Link
            key={d.id}
            href={`/wall/${d.id}`}
            className="group overflow-hidden rounded-xl border border-border bg-card transition hover:border-accent/50"
          >
            <div className="aspect-square overflow-hidden bg-border/40">
              {d.previewUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={d.previewUrl}
                  alt={d.title}
                  className="h-full w-full object-cover transition group-hover:scale-105"
                />
              )}
            </div>
            <div className="p-3">
              <p className="truncate font-medium">{d.title}</p>
              <p className="truncate text-sm text-muted">by {d.creator.displayName}</p>
            </div>
          </Link>
        ))}
      </div>

      {data && totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-4">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-md border border-border px-4 py-2 text-sm disabled:opacity-40"
          >
            ← Prev
          </button>
          <span className="text-sm text-muted">
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="rounded-md border border-border px-4 py-2 text-sm disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-sm capitalize transition ${
        active ? "border-accent bg-accent/10 text-accent" : "border-border hover:bg-border/40"
      }`}
    >
      {children}
    </button>
  );
}
