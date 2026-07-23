import { z } from "zod";

/** Image MIME types accepted for print uploads. */
export const ALLOWED_UPLOAD_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/tiff",
] as const;
export const uploadContentTypeSchema = z.enum(ALLOWED_UPLOAD_TYPES);

/** Hard ceiling on original upload size (bytes) — 50 MB. */
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

/** Step 1: ask the API for a presigned URL to upload the original file to. */
export const uploadIntentSchema = z.object({
  fileName: z.string().min(1).max(255),
  contentType: uploadContentTypeSchema,
});
export type UploadIntentInput = z.infer<typeof uploadIntentSchema>;

export interface UploadIntentResult {
  uploadUrl: string;
  objectKey: string;
  bucket: string;
}

/** Step 2 (after the browser PUTs the file): finalize and persist metadata. */
export const finalizeAssetSchema = z.object({
  objectKey: z.string().min(1).max(1024),
});
export type FinalizeAssetInput = z.infer<typeof finalizeAssetSchema>;

export interface AssetMetadata {
  id: string;
  bucket: string;
  objectKey: string;
  contentType: string;
  sizeBytes: number;
  widthPx: number | null;
  heightPx: number | null;
  previewUrl: string;
}
