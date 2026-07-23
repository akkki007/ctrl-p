import type { PosterSize } from "./catalog.js";
import { MIN_PRINT_DPI } from "./catalog.js";

/**
 * Physical print dimensions per size, in millimetres, stored as
 * `[shortEdgeMm, longEdgeMm]`. ISO "A" sizes are exact; imperial sizes are
 * their inch dimensions converted to mm.
 */
export const SIZE_DIMENSIONS_MM: Record<PosterSize, readonly [number, number]> = {
  A4: [210, 297],
  A3: [297, 420],
  A2: [420, 594],
  A1: [594, 841],
  "12x18": [304.8, 457.2],
  "18x24": [457.2, 609.6],
  "24x36": [609.6, 914.4],
};

const MM_PER_INCH = 25.4;

export function sizeDimensionsInches(size: PosterSize): readonly [number, number] {
  const [shortMm, longMm] = SIZE_DIMENSIONS_MM[size];
  return [shortMm / MM_PER_INCH, longMm / MM_PER_INCH];
}

export interface ResolutionCheck {
  /** Effective DPI the image would print at, orientation-agnostic. */
  dpi: number;
  /** True when `dpi >= MIN_PRINT_DPI`. */
  ok: boolean;
  /** Pixels the image would need on each edge to clear the DPI floor. */
  recommendedMinPx: { shortEdge: number; longEdge: number };
}

/**
 * Judge whether an image is sharp enough for a given print size.
 *
 * Orientation-agnostic: the image's long edge is matched to the print's long
 * edge (and short-to-short), so a landscape photo and its portrait crop score
 * identically. The effective DPI is the *lower* of the two edge DPIs — the
 * limiting axis decides print quality.
 */
export function checkResolution(
  widthPx: number,
  heightPx: number,
  size: PosterSize,
): ResolutionCheck {
  const imgLong = Math.max(widthPx, heightPx);
  const imgShort = Math.min(widthPx, heightPx);
  const [shortIn, longIn] = sizeDimensionsInches(size);

  const dpi = Math.floor(Math.min(imgLong / longIn, imgShort / shortIn));

  return {
    dpi,
    ok: dpi >= MIN_PRINT_DPI,
    recommendedMinPx: {
      shortEdge: Math.ceil(shortIn * MIN_PRINT_DPI),
      longEdge: Math.ceil(longIn * MIN_PRINT_DPI),
    },
  };
}
