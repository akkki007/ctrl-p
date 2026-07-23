"use client";

import type { FrameStyle } from "@ctrlp/shared";

const FRAME_STYLE: Record<FrameStyle, { padding: string; frame: string; mat: boolean }> = {
  none: { padding: "0", frame: "transparent", mat: false },
  black: { padding: "14px", frame: "#111111", mat: true },
  white: { padding: "14px", frame: "#f5f5f5", mat: true },
  "natural-wood": { padding: "14px", frame: "#a97142", mat: true },
};

/** A lightweight visual mockup of the framed print. */
export function FramePreview({
  src,
  frameStyle,
  alt = "Your artwork",
}: {
  src: string;
  frameStyle: FrameStyle;
  alt?: string;
}) {
  const style = FRAME_STYLE[frameStyle];

  return (
    <div
      className="inline-block max-w-full rounded-sm shadow-xl"
      style={{ background: style.frame, padding: style.padding }}
    >
      <div style={{ background: style.mat ? "#ffffff" : "transparent", padding: style.mat ? "12px" : "0" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className="block h-auto max-h-[420px] w-full object-contain"
        />
      </div>
    </div>
  );
}
