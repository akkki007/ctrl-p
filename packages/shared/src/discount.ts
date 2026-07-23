import { z } from "zod";

export const COUPON_TYPES = ["percent", "flat"] as const;
export const couponTypeSchema = z.enum(COUPON_TYPES);
export type CouponType = z.infer<typeof couponTypeSchema>;

/** The pieces of a coupon needed to compute a discount. */
export interface CouponSpec {
  type: CouponType;
  value: number;
  maxDiscountPaise?: number | null;
}

/**
 * Discount (paise) a coupon yields on a product subtotal. Percent coupons are
 * capped by `maxDiscountPaise`; a flat coupon never exceeds the subtotal. The
 * result never exceeds the subtotal (delivery is always payable).
 */
export function computeCouponDiscountPaise(coupon: CouponSpec, subtotalPaise: number): number {
  if (subtotalPaise <= 0) return 0;
  let discount: number;
  if (coupon.type === "percent") {
    discount = Math.round((subtotalPaise * Math.min(100, Math.max(0, coupon.value))) / 100);
    if (coupon.maxDiscountPaise != null) discount = Math.min(discount, coupon.maxDiscountPaise);
  } else {
    discount = Math.max(0, coupon.value);
  }
  return Math.min(discount, subtotalPaise);
}

export interface OrderTotalsBreakdown {
  subtotalPaise: number;
  deliveryFeePaise: number;
  couponDiscountPaise: number;
  pointsDiscountPaise: number;
  discountPaise: number;
  totalPaise: number;
}

/**
 * Fold coupon + points discounts into a cart's subtotal/delivery to get the
 * final total. Combined discount is capped at the subtotal; delivery is always
 * charged on top. Callers pass already-validated discount amounts.
 */
export function computeOrderTotals(input: {
  subtotalPaise: number;
  deliveryFeePaise: number;
  couponDiscountPaise: number;
  pointsDiscountPaise: number;
}): OrderTotalsBreakdown {
  const capped = Math.min(
    input.couponDiscountPaise + input.pointsDiscountPaise,
    input.subtotalPaise,
  );
  return {
    subtotalPaise: input.subtotalPaise,
    deliveryFeePaise: input.deliveryFeePaise,
    couponDiscountPaise: input.couponDiscountPaise,
    pointsDiscountPaise: input.pointsDiscountPaise,
    discountPaise: capped,
    totalPaise: Math.max(0, input.subtotalPaise + input.deliveryFeePaise - capped),
  };
}

// ── Schemas ──────────────────────────────────────────────────────────────────

const couponCode = z
  .string()
  .trim()
  .min(3)
  .max(32)
  .regex(/^[A-Za-z0-9_-]+$/, "Codes use letters, numbers, hyphens, and underscores")
  .transform((s) => s.toUpperCase());

export const applyCouponSchema = z.object({ code: couponCode });
export type ApplyCouponInput = z.infer<typeof applyCouponSchema>;

export const createCouponSchema = z
  .object({
    code: couponCode,
    description: z.string().trim().max(200).optional(),
    type: couponTypeSchema,
    value: z.number().int().min(1),
    maxDiscountPaise: z.number().int().min(0).nullable().optional(),
    minSubtotalPaise: z.number().int().min(0).default(0),
    startsAt: z.string().datetime().nullable().optional(),
    endsAt: z.string().datetime().nullable().optional(),
    usageLimit: z.number().int().min(1).nullable().optional(),
    perUserLimit: z.number().int().min(1).default(1),
    autoApply: z.boolean().default(false),
    active: z.boolean().default(true),
  })
  .refine((c) => c.type !== "percent" || c.value <= 100, {
    message: "Percent coupons cannot exceed 100",
    path: ["value"],
  });
export type CreateCouponInput = z.infer<typeof createCouponSchema>;

// ── View types ─────────────────────────────────────────────────────────────

export interface CouponView {
  id: string;
  code: string;
  description: string | null;
  type: CouponType;
  value: number;
  maxDiscountPaise: number | null;
  minSubtotalPaise: number;
  startsAt: string | null;
  endsAt: string | null;
  usageLimit: number | null;
  perUserLimit: number;
  autoApply: boolean;
  active: boolean;
  timesRedeemed: number;
  createdAt: string;
}

/** Result of validating a code against the current cart. */
export interface CouponPreview {
  code: string;
  discountPaise: number;
  description: string | null;
}

/** A deal surfaced to shoppers (auto-apply / promoted coupon). */
export interface DealView {
  code: string;
  description: string | null;
  type: CouponType;
  value: number;
}
