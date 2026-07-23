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

/** Payment lifecycle, tracked independently of fulfilment status. */
export const PAYMENT_STATUSES = ["pending", "paid", "failed"] as const;
export const paymentStatusSchema = z.enum(PAYMENT_STATUSES);
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;

/** Customer-facing labels for each status. */
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  placed: "Order placed",
  printing: "Printing",
  framing: "Framing",
  qc: "Quality check",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

/** The happy-path timeline shown to customers (excludes cancelled). */
export const ORDER_TIMELINE: readonly OrderStatus[] = [
  "placed",
  "printing",
  "framing",
  "qc",
  "shipped",
  "delivered",
];

/**
 * Allowed forward transitions for the fulfilment workflow. An order may be
 * cancelled from any pre-shipment state. Terminal states have no successors.
 * The admin API validates every status change against this map.
 */
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  placed: ["printing", "cancelled"],
  printing: ["framing", "cancelled"],
  framing: ["qc", "cancelled"],
  qc: ["shipped", "printing", "cancelled"], // QC can bounce back to reprint
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_STATUS_TRANSITIONS[from].includes(to);
}

/** Admin payload for advancing an order's fulfilment status. */
export const updateOrderStatusSchema = z.object({
  status: orderStatusSchema,
  note: z.string().max(500).optional(),
});
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
