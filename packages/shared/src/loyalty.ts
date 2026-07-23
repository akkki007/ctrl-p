import { z } from "zod";

/**
 * Loyalty economics (all integer math).
 * - Earn: 1 point per ₹10 of eligible spend.
 * - Redeem: 1 point is worth ₹1 (100 paise) off at checkout.
 * - Points may cover at most 50% of an order's product subtotal.
 */
export const LOYALTY_POINT_VALUE_PAISE = 100;
export const LOYALTY_EARN_PER_PAISE = 1000; // ₹10 = 1000 paise → 1 point
export const LOYALTY_MAX_REDEEM_PERCENT = 50;

/** Points earned on an eligible (post-discount) amount. */
export function pointsEarned(eligiblePaise: number): number {
  return Math.max(0, Math.floor(eligiblePaise / LOYALTY_EARN_PER_PAISE));
}

/** Rupee value (paise) of a number of points. */
export function pointsValuePaise(points: number): number {
  return Math.max(0, Math.floor(points)) * LOYALTY_POINT_VALUE_PAISE;
}

/**
 * Most points a user may redeem against a given subtotal: bounded by their
 * balance and by the 50%-of-subtotal cap.
 */
export function maxRedeemablePoints(subtotalPaise: number, balance: number): number {
  const capPaise = Math.floor((subtotalPaise * LOYALTY_MAX_REDEEM_PERCENT) / 100);
  const capPoints = Math.floor(capPaise / LOYALTY_POINT_VALUE_PAISE);
  return Math.max(0, Math.min(Math.floor(balance), capPoints));
}

export interface LoyaltyTransactionView {
  id: string;
  points: number;
  type: "earn" | "redeem" | "referral" | "adjustment";
  description: string;
  createdAt: string;
}

export interface LoyaltyView {
  balance: number;
  transactions: LoyaltyTransactionView[];
}

export const redeemPointsSchema = z.number().int().min(0).max(1_000_000);
