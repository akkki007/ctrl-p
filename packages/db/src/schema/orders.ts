import { relations } from "drizzle-orm";
import { integer, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { asset } from "./assets.js";
import { user } from "./auth.js";
import { wallDesign } from "./wall.js";

export const orderStatus = pgEnum("order_status", [
  "placed",
  "printing",
  "framing",
  "qc",
  "shipped",
  "delivered",
  "cancelled",
]);

/** Payment lifecycle, tracked independently of fulfilment status. */
export const paymentStatus = pgEnum("payment_status", ["pending", "paid", "failed"]);

export const order = pgTable("order", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id),
  status: orderStatus("status").notNull().default("placed"),
  /** All money as integer paise — never floats. */
  subtotalPaise: integer("subtotal_paise").notNull(),
  deliveryFeePaise: integer("delivery_fee_paise").notNull().default(0),
  totalPaise: integer("total_paise").notNull(),
  paymentStatus: paymentStatus("payment_status").notNull().default("pending"),
  paidAt: timestamp("paid_at"),
  razorpayOrderId: text("razorpay_order_id"),
  razorpayPaymentId: text("razorpay_payment_id"),
  /** Denormalized JSON snapshot of the shipping address at order time. */
  shippingAddress: text("shipping_address").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const orderItem = pgTable("order_item", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => order.id, { onDelete: "cascade" }),
  assetId: uuid("asset_id")
    .notNull()
    .references(() => asset.id),
  /** Set when this item was ordered from a Wall design (drives commission). */
  wallDesignId: uuid("wall_design_id").references(() => wallDesign.id),
  size: text("size").notNull(),
  material: text("material").notNull(),
  frameStyle: text("frame_style").notNull(),
  quantity: integer("quantity").notNull().default(1),
  unitPricePaise: integer("unit_price_paise").notNull(),
});

/** Audit trail powering customer-facing order tracking. */
export const orderStatusHistory = pgTable("order_status_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => order.id, { onDelete: "cascade" }),
  status: orderStatus("status").notNull(),
  note: text("note"),
  changedBy: text("changed_by").references(() => user.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── Relations (power the drizzle relational query API: db.query.*.with) ──────

export const orderRelations = relations(order, ({ one, many }) => ({
  user: one(user, { fields: [order.userId], references: [user.id] }),
  items: many(orderItem),
  history: many(orderStatusHistory),
}));

export const orderItemRelations = relations(orderItem, ({ one }) => ({
  order: one(order, { fields: [orderItem.orderId], references: [order.id] }),
  asset: one(asset, { fields: [orderItem.assetId], references: [asset.id] }),
  wallDesign: one(wallDesign, {
    fields: [orderItem.wallDesignId],
    references: [wallDesign.id],
  }),
}));

export const orderStatusHistoryRelations = relations(orderStatusHistory, ({ one }) => ({
  order: one(order, {
    fields: [orderStatusHistory.orderId],
    references: [order.id],
  }),
}));
