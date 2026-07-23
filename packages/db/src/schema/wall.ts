import { relations } from "drizzle-orm";
import { integer, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { asset } from "./assets.js";
import { user } from "./auth.js";

/** Moderation lifecycle for a design published to the Wall. */
export const designStatus = pgEnum("design_status", [
  "pending", // awaiting manual review
  "approved", // live in the public gallery
  "rejected", // failed review
  "removed", // taken down (by creator or upheld report)
]);

/** Copyright/abuse report lifecycle. */
export const reportStatus = pgEnum("report_status", ["open", "upheld", "dismissed"]);

/** Ledger entry kinds. Payouts (debit) land in Phase 3. */
export const walletTxnType = pgEnum("wallet_txn_type", ["commission", "payout", "adjustment"]);

/**
 * A creator's public identity. Created lazily the first time a user publishes
 * to the Wall. `handle` is the shareable slug used in /creators/:handle.
 */
export const creatorProfile = pgTable("creator_profile", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  handle: text("handle").notNull().unique(),
  displayName: text("display_name").notNull(),
  bio: text("bio"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/**
 * A design published to the Wall of Frames. Wraps an existing (creator-owned)
 * asset with marketplace metadata. Only `approved` designs are publicly
 * visible and orderable.
 */
export const wallDesign = pgTable("wall_design", {
  id: uuid("id").primaryKey().defaultRandom(),
  creatorId: text("creator_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  assetId: uuid("asset_id")
    .notNull()
    .references(() => asset.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  /** Freeform tags for search/browse. */
  tags: text("tags").array().notNull().default([]),
  status: designStatus("status").notNull().default("pending"),
  /** Creator's originality declaration, captured at publish time. */
  originalityDeclared: timestamp("originality_declared_at"),
  /** Denormalized popularity counters. */
  viewCount: integer("view_count").notNull().default(0),
  orderCount: integer("order_count").notNull().default(0),
  reviewedBy: text("reviewed_by").references(() => user.id),
  reviewedAt: timestamp("reviewed_at"),
  rejectionReason: text("rejection_reason"),
  /** Set by automated moderation when the image looks like a near-duplicate. */
  autoFlagReason: text("auto_flag_reason"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/**
 * Append-only wallet ledger. A creator's balance is the sum of their entries;
 * commissions are credited when a Wall order is paid.
 */
export const walletTransaction = pgTable("wallet_transaction", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  /** Signed integer paise — credits positive, debits (payouts) negative. */
  amountPaise: integer("amount_paise").notNull(),
  type: walletTxnType("type").notNull(),
  description: text("description").notNull(),
  orderId: uuid("order_id"),
  designId: uuid("design_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/** A copyright / abuse report filed against a published design. */
export const designReport = pgTable("design_report", {
  id: uuid("id").primaryKey().defaultRandom(),
  designId: uuid("design_id")
    .notNull()
    .references(() => wallDesign.id, { onDelete: "cascade" }),
  reporterId: text("reporter_id").references(() => user.id),
  reason: text("reason").notNull(),
  details: text("details"),
  status: reportStatus("status").notNull().default("open"),
  resolvedBy: text("resolved_by").references(() => user.id),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── Relations ────────────────────────────────────────────────────────────────

export const creatorProfileRelations = relations(creatorProfile, ({ one }) => ({
  user: one(user, { fields: [creatorProfile.userId], references: [user.id] }),
}));

export const wallDesignRelations = relations(wallDesign, ({ one, many }) => ({
  creator: one(user, { fields: [wallDesign.creatorId], references: [user.id] }),
  creatorProfile: one(creatorProfile, {
    fields: [wallDesign.creatorId],
    references: [creatorProfile.userId],
  }),
  asset: one(asset, { fields: [wallDesign.assetId], references: [asset.id] }),
  reports: many(designReport),
}));

export const designReportRelations = relations(designReport, ({ one }) => ({
  design: one(wallDesign, {
    fields: [designReport.designId],
    references: [wallDesign.id],
  }),
}));
