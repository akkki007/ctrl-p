import { z } from "zod";

export const BULK_QUOTE_STATUSES = ["new", "quoted", "won", "lost"] as const;
export const bulkQuoteStatusSchema = z.enum(BULK_QUOTE_STATUSES);
export type BulkQuoteStatus = z.infer<typeof bulkQuoteStatusSchema>;

/** Public B2B / bulk enquiry form. */
export const createBulkQuoteSchema = z.object({
  company: z.string().trim().min(2).max(150),
  contactName: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
  phone: z
    .string()
    .trim()
    .regex(/^(\+91)?[6-9]\d{9}$/, "Enter a valid Indian mobile number")
    .optional(),
  quantity: z.number().int().min(1).max(100000),
  details: z.string().trim().max(2000).optional(),
});
export type CreateBulkQuoteInput = z.infer<typeof createBulkQuoteSchema>;

/** Admin quoting / status update. */
export const updateBulkQuoteSchema = z.object({
  status: bulkQuoteStatusSchema.optional(),
  quotedPaise: z.number().int().min(0).nullable().optional(),
  adminNote: z.string().trim().max(2000).optional(),
});
export type UpdateBulkQuoteInput = z.infer<typeof updateBulkQuoteSchema>;

export interface BulkQuoteView {
  id: string;
  company: string;
  contactName: string;
  email: string;
  phone: string | null;
  quantity: number;
  details: string | null;
  status: BulkQuoteStatus;
  quotedPaise: number | null;
  adminNote: string | null;
  createdAt: string;
}
