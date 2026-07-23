import { z } from "zod";

/** Browse categories for the Wall of Frames. Stored as text; validated here. */
export const WALL_CATEGORIES = [
  "abstract",
  "photography",
  "typography",
  "nature",
  "anime",
  "movies",
  "music",
  "sports",
  "minimal",
  "other",
] as const;
export const wallCategorySchema = z.enum(WALL_CATEGORIES);
export type WallCategory = z.infer<typeof wallCategorySchema>;

/** Moderation status of a published design. */
export const DESIGN_STATUSES = ["pending", "approved", "rejected", "removed"] as const;
export const designStatusSchema = z.enum(DESIGN_STATUSES);
export type DesignStatus = z.infer<typeof designStatusSchema>;

export const REPORT_STATUSES = ["open", "upheld", "dismissed"] as const;
export const reportStatusSchema = z.enum(REPORT_STATUSES);
export type ReportStatus = z.infer<typeof reportStatusSchema>;

const tagSchema = z
  .string()
  .trim()
  .min(2)
  .max(30)
  .regex(/^[a-z0-9][a-z0-9 -]*$/i, "Tags use letters, numbers, spaces, and hyphens only");

/** Payload to publish an uploaded asset to the Wall. */
export const publishDesignSchema = z.object({
  assetId: z.string().uuid(),
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().max(1000).optional(),
  category: wallCategorySchema,
  tags: z.array(tagSchema).max(10).default([]),
  /** Must be true — the creator declares the work is theirs to sell. */
  originalityDeclared: z.literal(true),
});
export type PublishDesignInput = z.infer<typeof publishDesignSchema>;

/** Gallery query params. */
export const wallQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  category: wallCategorySchema.optional(),
  tag: tagSchema.optional(),
  sort: z.enum(["popular", "newest"]).default("newest"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(48).default(24),
});
export type WallQuery = z.infer<typeof wallQuerySchema>;

/** Reasons a design can be reported. */
export const REPORT_REASONS = [
  "copyright",
  "explicit",
  "hate-or-abuse",
  "spam",
  "other",
] as const;
export const reportReasonSchema = z.enum(REPORT_REASONS);
export type ReportReason = z.infer<typeof reportReasonSchema>;

export const reportDesignSchema = z.object({
  reason: reportReasonSchema,
  details: z.string().trim().max(1000).optional(),
});
export type ReportDesignInput = z.infer<typeof reportDesignSchema>;

/** Admin moderation decision. */
export const moderateDesignSchema = z
  .object({
    action: z.enum(["approve", "reject"]),
    reason: z.string().trim().max(500).optional(),
  })
  .refine((v) => v.action !== "reject" || !!v.reason, {
    message: "A reason is required when rejecting",
    path: ["reason"],
  });
export type ModerateDesignInput = z.infer<typeof moderateDesignSchema>;

/** Admin decision on a report. `uphold` takes the design down. */
export const resolveReportSchema = z.object({
  action: z.enum(["uphold", "dismiss"]),
});
export type ResolveReportInput = z.infer<typeof resolveReportSchema>;

export const updateCreatorProfileSchema = z.object({
  displayName: z.string().trim().min(2).max(80).optional(),
  bio: z.string().trim().max(500).optional(),
});
export type UpdateCreatorProfileInput = z.infer<typeof updateCreatorProfileSchema>;
