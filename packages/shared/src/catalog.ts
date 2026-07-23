import { z } from "zod";

/** Print sizes offered at launch — extend via DB-driven catalog later. */
export const POSTER_SIZES = ["A4", "A3", "A2", "A1", "12x18", "18x24", "24x36"] as const;
export const posterSizeSchema = z.enum(POSTER_SIZES);
export type PosterSize = z.infer<typeof posterSizeSchema>;

export const MATERIALS = ["matte", "glossy", "canvas"] as const;
export const materialSchema = z.enum(MATERIALS);
export type Material = z.infer<typeof materialSchema>;

export const FRAME_STYLES = ["none", "black", "white", "natural-wood"] as const;
export const frameStyleSchema = z.enum(FRAME_STYLES);
export type FrameStyle = z.infer<typeof frameStyleSchema>;

/** Minimum DPI for acceptable print quality; uploads below this get a warning. */
export const MIN_PRINT_DPI = 150;
