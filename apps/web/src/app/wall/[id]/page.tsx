"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { REPORT_REASONS, type ReportReason, type WallDesignDetail } from "@ctrlp/shared";
import { Customizer } from "../../../components/customizer";
import { ShareButton } from "../../../components/share-button";
import { api, ApiError } from "../../../lib/api";

export default function DesignDetailPage() {
  const params = useParams<{ id: string }>();
  const [design, setDesign] = useState<WallDesignDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reporting, setReporting] = useState(false);

  useEffect(() => {
    if (!params.id) return;
    api
      .getDesign(params.id)
      .then(setDesign)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Design not found"));
  }, [params.id]);

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
  if (!design) return <div className="mx-auto max-w-3xl px-4 py-16 text-muted">Loading…</div>;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Link href="/wall" className="text-sm text-muted hover:underline">
        ← Wall of Frames
      </Link>

      <div className="mt-3 mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{design.title}</h1>
          <p className="text-muted">
            by{" "}
            <Link
              href={`/creators/${design.creator.handle}`}
              className="font-medium text-accent hover:underline"
            >
              {design.creator.displayName}
            </Link>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ShareButton title={design.title} text={`Check out "${design.title}" on ctrlp`} />
          <button
            onClick={() => setReporting(true)}
            className="text-sm text-muted hover:text-red-500"
          >
            Report
          </button>
        </div>
      </div>

      {design.description && <p className="mb-4 max-w-2xl text-muted">{design.description}</p>}
      {design.tags.length > 0 && (
        <div className="mb-8 flex flex-wrap gap-2">
          {design.tags.map((t) => (
            <span key={t} className="rounded-full bg-border/50 px-2.5 py-0.5 text-xs text-muted">
              #{t}
            </span>
          ))}
        </div>
      )}

      {design.previewUrl ? (
        <Customizer
          image={{
            assetId: design.assetId,
            previewUrl: design.previewUrl,
            widthPx: null,
            heightPx: null,
            fileName: design.title,
          }}
          wallDesignId={design.id}
        />
      ) : (
        <p className="text-muted">Preview unavailable.</p>
      )}

      {reporting && (
        <ReportDialog designId={design.id} onClose={() => setReporting(false)} />
      )}
    </div>
  );
}

function ReportDialog({ designId, onClose }: { designId: string; onClose: () => void }) {
  const [reason, setReason] = useState<ReportReason>("copyright");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      await api.reportDesign(designId, { reason, details: details.trim() || undefined });
      setDone(true);
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 401
          ? "Please sign in to report a design."
          : err instanceof ApiError
            ? err.message
            : "Failed to submit report.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-border bg-card p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {done ? (
          <>
            <h2 className="mb-2 text-lg font-semibold">Thanks for the report</h2>
            <p className="mb-4 text-sm text-muted">
              Our team will review this design. Thanks for helping keep the Wall clean.
            </p>
            <button
              onClick={onClose}
              className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-fg"
            >
              Close
            </button>
          </>
        ) : (
          <>
            <h2 className="mb-4 text-lg font-semibold">Report this design</h2>
            <label className="mb-3 flex flex-col gap-1 text-sm">
              <span className="font-medium">Reason</span>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value as ReportReason)}
                className="rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-accent"
              >
                {REPORT_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r.replace(/-/g, " ")}
                  </option>
                ))}
              </select>
            </label>
            <label className="mb-4 flex flex-col gap-1 text-sm">
              <span className="font-medium">Details (optional)</span>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                rows={3}
                className="rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-accent"
              />
            </label>
            {error && <p className="mb-3 text-sm text-red-500">{error}</p>}
            <div className="flex justify-end gap-2">
              <button onClick={onClose} className="rounded-md border border-border px-4 py-2 text-sm">
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={submitting}
                className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-fg disabled:opacity-50"
              >
                {submitting ? "Submitting…" : "Submit report"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
