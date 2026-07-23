import { relations } from "drizzle-orm";
import { boolean, integer, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth.js";

// ── Loyalty points ───────────────────────────────────────────────────────────

export const loyaltyTxnType = pgEnum("loyalty_txn_type", [
  "earn", // credited when an order is paid
  "redeem", // spent as a checkout discount
  "referral", // referral reward
  "adjustment", // manual correction
]);

/** Append-only points ledger. Balance is the sum of a user's entries. */
export const loyaltyTransaction = pgTable("loyalty_transaction", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  /** Signed points — earn/referral positive, redeem negative. */
  points: integer("points").notNull(),
  type: loyaltyTxnType("type").notNull(),
  description: text("description").notNull(),
  orderId: uuid("order_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── Coupons / discount engine ────────────────────────────────────────────────

export const couponType = pgEnum("coupon_type", ["percent", "flat"]);

export const coupon = pgTable("coupon", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  description: text("description"),
  type: couponType("type").notNull(),
  /** percent → whole percent (e.g. 20); flat → discount in paise. */
  value: integer("value").notNull(),
  /** Cap for percent coupons, in paise (null = uncapped). */
  maxDiscountPaise: integer("max_discount_paise"),
  minSubtotalPaise: integer("min_subtotal_paise").notNull().default(0),
  startsAt: timestamp("starts_at"),
  endsAt: timestamp("ends_at"),
  /** Total redemptions allowed across all users (null = unlimited). */
  usageLimit: integer("usage_limit"),
  perUserLimit: integer("per_user_limit").notNull().default(1),
  /** Surfaced as a "current deal" and applied without typing a code. */
  autoApply: boolean("auto_apply").notNull().default(false),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const couponRedemption = pgTable("coupon_redemption", {
  id: uuid("id").primaryKey().defaultRandom(),
  couponId: uuid("coupon_id")
    .notNull()
    .references(() => coupon.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  orderId: uuid("order_id").notNull(),
  discountPaise: integer("discount_paise").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── Payouts (cash redemption of wallet balance) ──────────────────────────────

export const payoutStatus = pgEnum("payout_status", [
  "requested",
  "approved",
  "paid",
  "rejected",
]);

export const payoutRequest = pgTable("payout_request", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  amountPaise: integer("amount_paise").notNull(),
  status: payoutStatus("status").notNull().default("requested"),
  upiId: text("upi_id").notNull(),
  /** Minimal KYC captured at request time (last 4 of PAN). */
  panLast4: text("pan_last4"),
  note: text("note"),
  processedBy: text("processed_by").references(() => user.id),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── Notifications ────────────────────────────────────────────────────────────

export const notificationChannel = pgEnum("notification_channel", [
  "in_app",
  "email",
  "whatsapp",
]);

export const notification = pgTable("notification", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  channel: notificationChannel("channel").notNull().default("in_app"),
  /** Event key, e.g. "order.shipped", "wallet.credited". */
  type: text("type").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── Referrals ────────────────────────────────────────────────────────────────

/** A user's shareable referral code. Created lazily. */
export const referralCode = pgTable("referral_code", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  code: text("code").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/** Records who referred whom. One row per referee (a user is referred once). */
export const referral = pgTable("referral", {
  refereeId: text("referee_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  referrerId: text("referrer_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  code: text("code").notNull(),
  /** Set once the referee's first paid order triggers the reward. */
  rewardedAt: timestamp("rewarded_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── Relations ────────────────────────────────────────────────────────────────

export const couponRelations = relations(coupon, ({ many }) => ({
  redemptions: many(couponRedemption),
}));

export const couponRedemptionRelations = relations(couponRedemption, ({ one }) => ({
  coupon: one(coupon, { fields: [couponRedemption.couponId], references: [coupon.id] }),
}));

export const payoutRequestRelations = relations(payoutRequest, ({ one }) => ({
  user: one(user, { fields: [payoutRequest.userId], references: [user.id] }),
}));
