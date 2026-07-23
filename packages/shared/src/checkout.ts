import { z } from "zod";
import { frameStyleSchema, materialSchema, posterSizeSchema } from "./catalog.js";

/** Indian shipping address captured at checkout. */
export const shippingAddressSchema = z.object({
  fullName: z.string().min(2).max(120),
  phone: z
    .string()
    .regex(/^(\+91)?[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
  line1: z.string().min(3).max(200),
  line2: z.string().max(200).optional(),
  city: z.string().min(2).max(100),
  state: z.string().min(2).max(100),
  pincode: z.string().regex(/^\d{6}$/, "PIN code must be 6 digits"),
  landmark: z.string().max(200).optional(),
});
export type ShippingAddress = z.infer<typeof shippingAddressSchema>;

/** A single configured poster the customer wants printed. */
export const cartItemSchema = z.object({
  assetId: z.string().uuid(),
  size: posterSizeSchema,
  material: materialSchema,
  frameStyle: frameStyleSchema,
  quantity: z.number().int().min(1).max(20),
});
export type CartItem = z.infer<typeof cartItemSchema>;

/** Payload the web app POSTs to create an order. Prices are NOT accepted from
 * the client — the API recomputes every amount from the pricing matrix. */
export const createOrderSchema = z.object({
  items: z.array(cartItemSchema).min(1).max(50),
  shippingAddress: shippingAddressSchema,
});
export type CreateOrderInput = z.infer<typeof createOrderSchema>;

/** Razorpay handshake echoed back from the browser after the checkout modal. */
export const verifyPaymentSchema = z.object({
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});
export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;
