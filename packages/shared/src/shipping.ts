import { z } from "zod";

export const pincodeSchema = z.string().regex(/^\d{6}$/, "PIN code must be 6 digits");

/** The routing key a hub is matched on: the first 3 digits of a PIN code. */
export function pincodePrefix(pincode: string): string {
  return pincode.slice(0, 3);
}

export const checkDeliverySchema = z.object({ pincode: pincodeSchema });
export type CheckDeliveryInput = z.infer<typeof checkDeliverySchema>;

export interface ServiceabilityResult {
  serviceable: boolean;
  hubName: string | null;
  city: string | null;
}

const prefix = z.string().regex(/^\d{3}$/, "Prefixes are 3 digits");

export const createHubSchema = z.object({
  name: z.string().trim().min(2).max(120),
  city: z.string().trim().min(2).max(100),
  pincodePrefixes: z.array(prefix).min(1).max(500),
  active: z.boolean().default(true),
});
export type CreateHubInput = z.infer<typeof createHubSchema>;

export const updateHubSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  pincodePrefixes: z.array(prefix).min(1).max(500).optional(),
  active: z.boolean().optional(),
});
export type UpdateHubInput = z.infer<typeof updateHubSchema>;

export interface HubView {
  id: string;
  name: string;
  city: string;
  pincodePrefixes: string[];
  active: boolean;
  /** Orders currently routed to this hub. */
  orderCount: number;
  createdAt: string;
}

/** Shipment tracking attached to an order once it ships. */
export interface ShipmentInfo {
  courierName: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
}
