"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ALLOWED_UPLOAD_TYPES,
  type AssetMetadata,
  MAX_UPLOAD_BYTES,
} from "@ctrlp/shared";
import { Customizer } from "../../components/customizer";
import { PublishPanel } from "../../components/publish-panel";
import { api, putToPresignedUrl } from "../../lib/api";
import { useSession } from "../../lib/auth-client";

type UploadState = "idle" | "uploading" | "done";

export default function CreatePage() {
  const { data, isPending } = useSession();

  const [asset, setAsset] = useState<AssetMetadata | null>(null);
  const [fileName, setFileName] = useState("");
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    const contentType = file.type as (typeof ALLOWED_UPLOAD_TYPES)[number];
    if (!ALLOWED_UPLOAD_TYPES.includes(contentType)) {
      setError("Please upload a JPEG, PNG, WebP, or TIFF image.");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError("That file is over the 50 MB limit.");
      return;
    }

    setFileName(file.name);
    setUploadState("uploading");
    try {
      const intent = await api.uploadIntent({ fileName: file.name, contentType });
      await putToPresignedUrl(intent.uploadUrl, file);
      const finalized = await api.finalizeAsset({ objectKey: intent.objectKey });
      setAsset(finalized);
      setUploadState("done");
    } catch (err) {
      setUploadState("idle");
      setError(err instanceof Error ? err.message : "Upload failed. Please try again.");
    }
  }

  if (!isPending && !data?.user) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="mb-2 text-2xl font-semibold">Sign in to start</h1>
        <p className="mb-6 text-muted">You need an account to upload and order prints.</p>
        <Link
          href="/sign-in?next=/create"
          className="rounded-full bg-accent px-6 py-3 font-medium text-accent-fg"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="mb-8 text-3xl font-semibold tracking-tight">Create your print</h1>

      {!asset ? (
        <>
          <UploadDropzone onFile={handleFile} />
          {uploadState === "uploading" && (
            <p className="mt-3 text-sm text-muted">Uploading &amp; checking resolution…</p>
          )}
          {error && (
            <p className="mt-3 rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
        </>
      ) : (
        <div className="flex flex-col gap-8">
          <Customizer
            image={{
              assetId: asset.id,
              previewUrl: asset.previewUrl,
              widthPx: asset.widthPx,
              heightPx: asset.heightPx,
              fileName,
            }}
          />
          <PublishPanel assetId={asset.id} />
          <button
            onClick={() => {
              setAsset(null);
              setUploadState("idle");
            }}
            className="self-start text-sm font-medium text-accent hover:underline"
          >
            ← Upload a different image
          </button>
        </div>
      )}
    </div>
  );
}

function UploadDropzone({ onFile }: { onFile: (file: File) => void }) {
  const [dragging, setDragging] = useState(false);
  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) onFile(file);
      }}
      className={`flex min-h-[320px] cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 text-center transition ${
        dragging ? "border-accent bg-accent/5" : "border-border bg-card"
      }`}
    >
      <div className="grid h-12 w-12 place-items-center rounded-full bg-accent/10 text-2xl text-accent">
        ↑
      </div>
      <p className="font-medium">Drag &amp; drop your image here</p>
      <p className="text-sm text-muted">or click to browse — JPEG, PNG, WebP, TIFF up to 50 MB</p>
      <input
        type="file"
        accept={ALLOWED_UPLOAD_TYPES.join(",")}
        className="hidden"
        onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
      />
    </label>
  );
}
