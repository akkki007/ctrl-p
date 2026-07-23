import { z } from "zod";

/** Points awarded to BOTH parties when a referee's first order is paid. */
export const REFERRAL_POINTS = 100;

export const referralCodeSchema = z
  .string()
  .trim()
  .min(4)
  .max(24)
  .regex(/^[A-Za-z0-9]+$/, "Referral codes are letters and numbers only")
  .transform((s) => s.toUpperCase());

export const claimReferralSchema = z.object({ code: referralCodeSchema });
export type ClaimReferralInput = z.infer<typeof claimReferralSchema>;

export interface ReferralView {
  code: string;
  /** How many referees have signed up with this code. */
  referredCount: number;
  /** How many have converted (first paid order → reward). */
  rewardedCount: number;
  pointsPerReferral: number;
  /** Set if the current user was themselves referred (and by whom). */
  referredBy: string | null;
}
