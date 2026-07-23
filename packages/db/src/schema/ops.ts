import { boolean, integer, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth.js";

/**
 * A fulfilment hub — a studio/city that prints, frames, and ships. Serviceable
 * PIN codes are matched by 3-digit prefix. Adding a hub widens delivery.
 */
export const fulfillmentHub = pgTable("fulfillment_hub", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  city: text("city").notNull(),
  /** 3-digit PIN prefixes this hub serves (e.g. "411", "412"). */
  pincodePrefixes: text("pincode_prefixes").array().notNull().default([]),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const bulkQuoteStatus = pgEnum("bulk_quote_status", [
  "new",
  "quoted",
  "won",
  "lost",
]);

/** A B2B / bulk enquiry (cafés, offices, gifting). Lead-capture + quoting. */
export const bulkQuote = pgTable("bulk_quote", {
  id: uuid("id").primaryKey().defaultRandom(),
  company: text("company").notNull(),
  contactName: text("contact_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  quantity: integer("quantity").notNull(),
  details: text("details"),
  status: bulkQuoteStatus("status").notNull().default("new"),
  /** Admin's quoted price, in paise. */
  quotedPaise: integer("quoted_paise"),
  adminNote: text("admin_note"),
  handledBy: text("handled_by").references(() => user.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
