"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ALLOWED_UPLOAD_TYPES,
  type AssetMetadata,
  FRAME_STYLES,
  type FrameStyle,
  MATERIALS,
  MAX_UPLOAD_BYTES,
  type Material,
  POSTER_SIZES,
  type PosterSize,
  checkResolution,
  formatPaise,
  priceUnit,
} from "@ctrlp/shared";
import { FramePreview } from "../../components/frame-preview";
import { api, putToPresignedUrl } from "../../lib/api";
import { useSession } from "../../lib/auth-client";
import { useCart } from "../../lib/cart";

const MATERIAL_LABELS: Record<Material, string> = {
  matte: "Matte",
  glossy: "Glossy",
  canvas: "Canvas",
};
const FRAME_LABELS: Record<FrameStyle, string> = {
  none: "No frame",
  black: "Black",
  white: "White",
  "natural-wood": "Natural wood",
};
const SIZE_LABELS: Record<PosterSize, string> = {
  A4: "A4 · 21×29.7cm",
  A3: "A3 · 29.7×42cm",
  A2: "A2 · 42×59.4cm",
  A1: "A1 · 59.4×84.1cm",
  "12x18": '12×18"',
  "18x24": '18×24"',
  "24x36": '24×36"',
};

type UploadState = "idle" | "uploading" | "done";

export default function CreatePage() {
  const { data, isPending } = useSession();
  const router = useRouter();
  const cart = useCart();

  const [asset, setAsset] = useState<AssetMetadata | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [error, setError] = useState<string | null>(null);

  const [size, setSize] = useState<PosterSize>("A3");
  const [material, setMaterial] = useState<Material>("matte");
  const [frameStyle, setFrameStyle] = useState<FrameStyle>("black");
  const [quantity, setQuantity] = useState(1);

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
    setLocalPreview(URL.createObjectURL(file));
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

  function handleAddToCart() {
    if (!asset) return;
    cart.add({
      assetId: asset.id,
      previewUrl: asset.previewUrl,
      fileName,
      widthPx: asset.widthPx,
      heightPx: asset.heightPx,
      size,
      material,
      frameStyle,
      quantity,
    });
    router.push("/cart");
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

  const preview = asset?.previewUrl ?? localPreview;
  const resolution =
    asset?.widthPx && asset.heightPx
      ? checkResolution(asset.widthPx, asset.heightPx, size)
      : null;
  const price = priceUnit({ size, material, frameStyle });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="mb-8 text-3xl font-semibold tracking-tight">Create your print</h1>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* ── Left: upload + preview ─────────────────────────── */}
        <div>
          {!preview ? (
            <UploadDropzone onFile={handleFile} />
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="flex min-h-[300px] w-full items-center justify-center rounded-xl border border-border bg-card p-8">
                <FramePreview src={preview} frameStyle={frameStyle} />
              </div>
              <label className="cursor-pointer text-sm font-medium text-accent hover:underline">
                Replace image
                <input
                  type="file"
                  accept={ALLOWED_UPLOAD_TYPES.join(",")}
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                />
              </label>
            </div>
          )}

          {uploadState === "uploading" && (
            <p className="mt-3 text-sm text-muted">Uploading &amp; checking resolution…</p>
          )}
          {error && (
            <p className="mt-3 rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
        </div>

        {/* ── Right: customiser ──────────────────────────────── */}
        <div className="flex flex-col gap-6">
          {resolution && !resolution.ok && (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
              <strong>Low resolution for {SIZE_LABELS[size]}.</strong> This image prints at ~
              {resolution.dpi} DPI; we recommend at least 150 DPI (
              {resolution.recommendedMinPx.longEdge}px on the long edge) for a crisp result.
            </div>
          )}

          <OptionGroup label="Size">
            {POSTER_SIZES.map((s) => (
              <Option key={s} selected={size === s} onClick={() => setSize(s)}>
                {SIZE_LABELS[s]}
              </Option>
            ))}
          </OptionGroup>

          <OptionGroup label="Material">
            {MATERIALS.map((m) => (
              <Option key={m} selected={material === m} onClick={() => setMaterial(m)}>
                {MATERIAL_LABELS[m]}
              </Option>
            ))}
          </OptionGroup>

          <OptionGroup label="Frame">
            {FRAME_STYLES.map((f) => (
              <Option key={f} selected={frameStyle === f} onClick={() => setFrameStyle(f)}>
                {FRAME_LABELS[f]}
              </Option>
            ))}
          </OptionGroup>

          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">Quantity</span>
            <div className="flex items-center rounded-md border border-border">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="px-3 py-1.5 text-lg leading-none hover:bg-border/40"
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span className="w-10 text-center">{quantity}</span>
              <button
                onClick={() => setQuantity((q) => Math.min(20, q + 1))}
                className="px-3 py-1.5 text-lg leading-none hover:bg-border/40"
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between text-sm text-muted">
              <span>Print ({MATERIAL_LABELS[material]})</span>
              <span>{formatPaise(price.printPaise)}</span>
            </div>
            {price.framePaise > 0 && (
              <div className="mt-1 flex items-center justify-between text-sm text-muted">
                <span>Frame ({FRAME_LABELS[frameStyle]})</span>
                <span>{formatPaise(price.framePaise)}</span>
              </div>
            )}
            <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-lg font-semibold">
              <span>{quantity > 1 ? `Total (×${quantity})` : "Unit price"}</span>
              <span>{formatPaise(price.unitPricePaise * quantity)}</span>
            </div>
          </div>

          <button
            onClick={handleAddToCart}
            disabled={uploadState !== "done"}
            className="rounded-full bg-accent px-6 py-3 font-medium text-accent-fg transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {uploadState === "done" ? "Add to cart" : "Upload an image first"}
          </button>
        </div>
      </div>
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

function OptionGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Option({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md border px-3 py-1.5 text-sm transition ${
        selected
          ? "border-accent bg-accent/10 font-medium text-accent"
          : "border-border hover:bg-border/40"
      }`}
    >
      {children}
    </button>
  );
}
