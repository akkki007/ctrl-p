import { z } from "zod";

/** Order lifecycle from the plan: Placed → Printing → Framing → QC → Shipped → Delivered */
export const ORDER_STATUSES = [
  "placed",
  "printing",
  "framing",
  "qc",
  "shipped",
  "delivered",
  "cancelled",
] as const;

export const orderStatusSchema = z.enum(ORDER_STATUSES);
export type OrderStatus = z.infer<typeof orderStatusSchema>;
