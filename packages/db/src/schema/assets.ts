import { bigint, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth.js";

/**
 * Metadata for files stored in MinIO. The bytes never live in Postgres —
 * `bucket` + `objectKey` locate them; presigned URLs serve them.
 */
export const asset = pgTable("asset", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: text("owner_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  bucket: text("bucket").notNull(),
  objectKey: text("object_key").notNull().unique(),
  contentType: text("content_type").notNull(),
  sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
  widthPx: integer("width_px"),
  heightPx: integer("height_px"),
  checksumSha256: text("checksum_sha256"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
