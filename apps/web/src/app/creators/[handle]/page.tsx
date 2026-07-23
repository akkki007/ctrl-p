"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { CreatorProfilePage } from "@ctrlp/shared";
import { ShareButton } from "../../../components/share-button";
import { api, ApiError } from "../../../lib/api";

export default function CreatorPage() {
  const params = useParams<{ handle: string }>();
  const [data, setData] = useState<CreatorProfilePage | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params.handle) return;
    api
      .getCreator(params.handle)
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Creator not found"));
  }, [params.handle]);

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="mb-4 text-muted">{error}</p>
        <Link href="/wall" className="font-medium text-accent hover:underline">
          ← Back to the Wall
        </Link>
      </div>
    );
  }
  if (!data) return <div className="mx-auto max-w-3xl px-4 py-16 text-muted">Loading…</div>;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <header className="mb-8 flex flex-col items-center gap-2 text-center">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-accent/10 text-2xl font-semibold text-accent">
          {data.creator.displayName.charAt(0).toUpperCase()}
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">{data.creator.displayName}</h1>
        <p className="text-sm text-muted">@{data.creator.handle}</p>
        {data.creator.bio && <p className="max-w-xl text-muted">{data.creator.bio}</p>}
        <div className="mt-1">
          <ShareButton
            title={`${data.creator.displayName} on ctrlp`}
            text={`Check out ${data.creator.displayName}'s designs on ctrlp`}
          />
        </div>
      </header>

      {data.designs.length === 0 ? (
        <p className="text-center text-muted">No published designs yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {data.designs.map((d) => (
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
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
