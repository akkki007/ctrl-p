import { createHash, randomUUID } from "node:crypto";
import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import sharp from "sharp";
import { DB } from "../db/db.module.js";
import { StorageService } from "../storage/storage.service.js";
import type { Database } from "@ctrlp/db";
import { schema } from "@ctrlp/db";
import {
  type AssetMetadata,
  MAX_UPLOAD_BYTES,
  type UploadIntentInput,
  type UploadIntentResult,
} from "@ctrlp/shared";

const SHARP_FORMAT_TO_MIME: Record<string, string> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  tiff: "image/tiff",
};

/** Strip anything that isn't safe in an object key path segment. */
function safeFileName(name: string): string {
  const base = name.split("/").pop() ?? "upload";
  return base.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "upload";
}

/**
 * 64-bit perceptual dHash as 16 hex chars. Resizes to 9×8 greyscale and, for
 * each row, sets a bit where a pixel is brighter than its right neighbour —
 * robust to scaling and mild edits, the basis for near-duplicate detection.
 */
async function computeDHash(buffer: Buffer): Promise<string | null> {
  try {
    const w = 9;
    const h = 8;
    const pixels = await sharp(buffer).resize(w, h, { fit: "fill" }).grayscale().raw().toBuffer();
    let bits = "";
    for (let row = 0; row < h; row++) {
      for (let col = 0; col < w - 1; col++) {
        const left = pixels[row * w + col]!;
        const right = pixels[row * w + col + 1]!;
        bits += left > right ? "1" : "0";
      }
    }
    // 64 bits → 16 hex chars.
    let hex = "";
    for (let i = 0; i < 64; i += 4) {
      hex += Number.parseInt(bits.slice(i, i + 4), 2).toString(16);
    }
    return hex;
  } catch {
    return null;
  }
}

@Injectable()
export class AssetsService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly storage: StorageService,
  ) {}

  /**
   * Hand the browser a presigned URL to PUT the original file to. The object
   * key is namespaced under the user's id so a finalize call can never claim
   * another user's upload.
   */
  async createUploadIntent(
    userId: string,
    input: UploadIntentInput,
  ): Promise<UploadIntentResult> {
    const objectKey = `${userId}/${randomUUID()}/${safeFileName(input.fileName)}`;
    const uploadUrl = await this.storage.presignedPut("uploads", objectKey);
    return { uploadUrl, objectKey, bucket: this.storage.bucketFor("uploads") };
  }

  /**
   * Confirm the upload landed, read its real dimensions with sharp, and persist
   * the metadata row. Dimensions are read server-side so the client can't lie
   * about resolution to defeat the print-quality check.
   */
  async finalize(userId: string, objectKey: string): Promise<AssetMetadata> {
    if (!objectKey.startsWith(`${userId}/`)) {
      throw new BadRequestException("Object key does not belong to you");
    }
    if (!(await this.storage.objectExists("uploads", objectKey))) {
      throw new BadRequestException("Upload not found — did the PUT succeed?");
    }

    const buffer = await this.storage.getObjectBuffer("uploads", objectKey);
    if (buffer.byteLength > MAX_UPLOAD_BYTES) {
      throw new BadRequestException("File exceeds the 50 MB upload limit");
    }

    let meta: sharp.Metadata;
    try {
      meta = await sharp(buffer).metadata();
    } catch {
      throw new BadRequestException("File is not a readable image");
    }

    const contentType = SHARP_FORMAT_TO_MIME[meta.format ?? ""] ?? "application/octet-stream";
    const checksum = createHash("sha256").update(buffer).digest("hex");
    const phash = await computeDHash(buffer);

    const [row] = await this.db
      .insert(schema.asset)
      .values({
        ownerId: userId,
        bucket: this.storage.bucketFor("uploads"),
        objectKey,
        contentType,
        sizeBytes: buffer.byteLength,
        widthPx: meta.width ?? null,
        heightPx: meta.height ?? null,
        checksumSha256: checksum,
        phash,
      })
      .returning();

    if (!row) {
      throw new BadRequestException("Failed to persist asset");
    }
    return this.toMetadata(row);
  }

  /** Fetch an asset the caller owns, or throw 404. */
  async getOwned(userId: string, assetId: string): Promise<AssetMetadata> {
    const row = await this.findOwned(userId, assetId);
    if (!row) {
      throw new NotFoundException("Asset not found");
    }
    return this.toMetadata(row);
  }

  /** Row lookup scoped to the owner — returns undefined when absent. */
  async findOwned(userId: string, assetId: string) {
    return this.db.query.asset.findFirst({
      where: and(eq(schema.asset.id, assetId), eq(schema.asset.ownerId, userId)),
    });
  }

  private async toMetadata(row: typeof schema.asset.$inferSelect): Promise<AssetMetadata> {
    // 24h so previews survive a browsing/checkout session without re-signing.
    const previewUrl = await this.storage.presignedGet("uploads", row.objectKey, 24 * 60 * 60);
    return {
      id: row.id,
      bucket: row.bucket,
      objectKey: row.objectKey,
      contentType: row.contentType,
      sizeBytes: row.sizeBytes,
      widthPx: row.widthPx,
      heightPx: row.heightPx,
      previewUrl,
    };
  }
}
