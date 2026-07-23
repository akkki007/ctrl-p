"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  FRAME_STYLES,
  type FrameStyle,
  MATERIALS,
  type Material,
  POSTER_SIZES,
  type PosterSize,
  checkResolution,
  formatPaise,
  priceUnit,
} from "@ctrlp/shared";
import { useCart } from "../lib/cart";
import { FramePreview } from "./frame-preview";

export const MATERIAL_LABELS: Record<Material, string> = {
  matte: "Matte",
  glossy: "Glossy",
  canvas: "Canvas",
};
export const FRAME_LABELS: Record<FrameStyle, string> = {
  none: "No frame",
  black: "Black",
  white: "White",
  "natural-wood": "Natural wood",
};
export const SIZE_LABELS: Record<PosterSize, string> = {
  A4: "A4 · 21×29.7cm",
  A3: "A3 · 29.7×42cm",
  A2: "A2 · 42×59.4cm",
  A1: "A1 · 59.4×84.1cm",
  "12x18": '12×18"',
  "18x24": '18×24"',
  "24x36": '24×36"',
};

export interface CustomizerImage {
  assetId: string;
  previewUrl: string;
  widthPx: number | null;
  heightPx: number | null;
  fileName: string;
}

/**
 * Size/material/frame/quantity picker with a live price, DPI warning, and
 * framed mockup. Shared by the "print your own upload" flow and the "order a
 * Wall design" flow — pass `wallDesignId` for the latter so commission is
 * credited to the creator.
 */
export function Customizer({
  image,
  wallDesignId,
}: {
  image: CustomizerImage;
  wallDesignId?: string;
}) {
  const cart = useCart();
  const router = useRouter();

  const [size, setSize] = useState<PosterSize>("A3");
  const [material, setMaterial] = useState<Material>("matte");
  const [frameStyle, setFrameStyle] = useState<FrameStyle>("black");
  const [quantity, setQuantity] = useState(1);

  const resolution =
    image.widthPx && image.heightPx
      ? checkResolution(image.widthPx, image.heightPx, size)
      : null;
  const price = priceUnit({ size, material, frameStyle });

  function addToCart() {
    cart.add({
      assetId: image.assetId,
      wallDesignId,
      previewUrl: image.previewUrl,
      fileName: image.fileName,
      widthPx: image.widthPx,
      heightPx: image.heightPx,
      size,
      material,
      frameStyle,
      quantity,
    });
    router.push("/cart");
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="flex min-h-[300px] items-center justify-center rounded-xl border border-border bg-card p-8">
        <FramePreview src={image.previewUrl} frameStyle={frameStyle} />
      </div>

      <div className="flex flex-col gap-6">
        {resolution && !resolution.ok && (
          <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
            <strong>Low resolution for {SIZE_LABELS[size]}.</strong> This image prints at ~
            {resolution.dpi} DPI; we recommend at least 150 DPI (
            {resolution.recommendedMinPx.longEdge}px on the long edge).
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
          onClick={addToCart}
          className="rounded-full bg-accent px-6 py-3 font-medium text-accent-fg transition hover:opacity-90"
        >
          Add to cart
        </button>
      </div>
    </div>
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
