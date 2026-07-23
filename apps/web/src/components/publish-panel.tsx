"use client";

import Link from "next/link";
import { useState } from "react";
import { WALL_CATEGORIES, WALL_COMMISSION_PERCENT, type WallCategory } from "@ctrlp/shared";
import { api, ApiError } from "../lib/api";

/** "Publish to Wall" flow shown after an upload on the create page. */
export function PublishPanel({ assetId }: { assetId: string }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<WallCategory>("photography");
  const [tagsInput, setTagsInput] = useState("");
  const [originality, setOriginality] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function publish() {
    setError(null);
    if (title.trim().length < 3) {
      setError("Give your design a title (at least 3 characters).");
      return;
    }
    if (!originality) {
      setError("Please confirm the originality declaration.");
      return;
    }
    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 10);

    setSubmitting(true);
    try {
      await api.publishDesign({
        assetId,
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        tags,
        originalityDeclared: true,
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to publish.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-xl border border-green-500/40 bg-green-500/10 p-5 text-sm">
        <p className="font-medium text-green-700 dark:text-green-300">
          Submitted for review 🎉
        </p>
        <p className="mt-1 text-muted">
          We&apos;ll manually review your design before it goes live on the Wall. Track it in{" "}
          <Link href="/studio" className="font-medium text-accent hover:underline">
            your studio
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={open}
          onChange={(e) => setOpen(e.target.checked)}
          className="mt-1"
        />
        <span>
          <span className="font-medium">Publish to the Wall of Frames</span>
          <span className="block text-sm text-muted">
            Let others order this design and earn {WALL_COMMISSION_PERCENT}% commission each time.
          </span>
        </span>
      </label>

      {open && (
        <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4">
          <TextInput label="Title" value={title} onChange={setTitle} placeholder="Sunset over the hills" />
          <TextInput
            label="Description (optional)"
            value={description}
            onChange={setDescription}
            placeholder="A few words about the piece"
          />
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Category</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as WallCategory)}
              className="rounded-md border border-border bg-background px-3 py-2 capitalize outline-none focus:border-accent"
            >
              {WALL_CATEGORIES.map((c) => (
                <option key={c} value={c} className="capitalize">
                  {c}
                </option>
              ))}
            </select>
          </label>
          <TextInput
            label="Tags (comma-separated)"
            value={tagsInput}
            onChange={setTagsInput}
            placeholder="landscape, warm, minimal"
          />

          <label className="flex items-start gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={originality}
              onChange={(e) => setOriginality(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              I declare this is my original work (or I hold the rights to sell it), and I accept
              the takedown policy for copyright complaints.
            </span>
          </label>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            onClick={publish}
            disabled={submitting}
            className="self-start rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-fg transition hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Submit for review"}
          </button>
        </div>
      )}
    </div>
  );
}

function TextInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium">{label}</span>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-accent"
      />
    </label>
  );
}
