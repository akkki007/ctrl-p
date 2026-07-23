import { z } from "zod";

/** Minimum wallet balance (paise) required to request a cash payout: ₹500. */
export const MIN_PAYOUT_PAISE = 50000;

export const PAYOUT_STATUSES = ["requested", "approved", "paid", "rejected"] as const;
export const payoutStatusSchema = z.enum(PAYOUT_STATUSES);
export type PayoutStatus = z.infer<typeof payoutStatusSchema>;

const upiId = z
  .string()
  .trim()
  .regex(/^[\w.-]{2,256}@[a-zA-Z]{2,64}$/, "Enter a valid UPI ID (e.g. name@bank)");

export const requestPayoutSchema = z.object({
  amountPaise: z.number().int().min(MIN_PAYOUT_PAISE),
  upiId,
  /** Last 4 digits of PAN for minimal KYC. */
  panLast4: z
    .string()
    .trim()
    .regex(/^\d{4}$/, "Enter the last 4 digits of your PAN")
    .optional(),
});
export type RequestPayoutInput = z.infer<typeof requestPayoutSchema>;

export const processPayoutSchema = z.object({
  action: z.enum(["approve", "pay", "reject"]),
  note: z.string().trim().max(300).optional(),
});
export type ProcessPayoutInput = z.infer<typeof processPayoutSchema>;

export interface PayoutRequestView {
  id: string;
  amountPaise: number;
  status: PayoutStatus;
  upiId: string;
  note: string | null;
  createdAt: string;
  processedAt: string | null;
}

export interface AdminPayoutView extends PayoutRequestView {
  userId: string;
  customerName: string;
  customerEmail: string;
  panLast4: string | null;
}
