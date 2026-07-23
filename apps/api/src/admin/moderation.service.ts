import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { desc, eq } from "drizzle-orm";
import { DB } from "../db/db.module.js";
import { StorageService } from "../storage/storage.service.js";
import type { Database } from "@ctrlp/db";
import { schema } from "@ctrlp/db";
import {
  type AdminDesignSummary,
  type AdminReportView,
  type DesignStatus,
  type ModerateDesignInput,
  type ReportReason,
  type ReportStatus,
  type ResolveReportInput,
  type WallCategory,
} from "@ctrlp/shared";

@Injectable()
export class ModerationService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly storage: StorageService,
  ) {}

  /** Designs awaiting (or filtered by) moderation, newest first. */
  async listDesigns(status: DesignStatus = "pending"): Promise<AdminDesignSummary[]> {
    const rows = await this.db.query.wallDesign.findMany({
      where: eq(schema.wallDesign.status, status),
      orderBy: [desc(schema.wallDesign.createdAt)],
      with: { asset: true, creatorProfile: true },
    });

    return Promise.all(
      rows.map(async (r) => ({
        id: r.id,
        title: r.title,
        category: r.category as WallCategory,
        tags: r.tags,
        previewUrl: await this.preview(r.asset?.objectKey),
        status: r.status,
        rejectionReason: r.rejectionReason,
        orderCount: r.orderCount,
        createdAt: r.createdAt.toISOString(),
        assetId: r.assetId,
        autoFlagReason: r.autoFlagReason,
        creator: {
          handle: r.creatorProfile?.handle ?? "",
          displayName: r.creatorProfile?.displayName ?? "Unknown",
          bio: r.creatorProfile?.bio ?? null,
        },
      })),
    );
  }

  /** Approve or reject a design. Rejection records the reason. */
  async moderateDesign(
    adminId: string,
    designId: string,
    input: ModerateDesignInput,
  ): Promise<{ ok: true }> {
    const design = await this.db.query.wallDesign.findFirst({
      where: eq(schema.wallDesign.id, designId),
      columns: { id: true },
    });
    if (!design) throw new NotFoundException("Design not found");

    await this.db
      .update(schema.wallDesign)
      .set({
        status: input.action === "approve" ? "approved" : "rejected",
        rejectionReason: input.action === "reject" ? (input.reason ?? null) : null,
        reviewedBy: adminId,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schema.wallDesign.id, designId));
    return { ok: true };
  }

  /** Reports, default to the open queue. */
  async listReports(status: ReportStatus = "open"): Promise<AdminReportView[]> {
    const rows = await this.db.query.designReport.findMany({
      where: eq(schema.designReport.status, status),
      orderBy: [desc(schema.designReport.createdAt)],
      with: { design: { with: { asset: true } } },
    });

    return Promise.all(
      rows.map(async (r) => ({
        id: r.id,
        reason: r.reason as ReportReason,
        details: r.details,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
        design: {
          id: r.design.id,
          title: r.design.title,
          previewUrl: await this.preview(r.design.asset?.objectKey),
          status: r.design.status,
        },
      })),
    );
  }

  /**
   * Resolve a report. `uphold` takes the design down (status → removed);
   * `dismiss` closes the report and leaves the design as-is.
   */
  async resolveReport(
    adminId: string,
    reportId: string,
    input: ResolveReportInput,
  ): Promise<{ ok: true }> {
    const report = await this.db.query.designReport.findFirst({
      where: eq(schema.designReport.id, reportId),
      columns: { id: true, designId: true },
    });
    if (!report) throw new NotFoundException("Report not found");

    await this.db.transaction(async (tx) => {
      await tx
        .update(schema.designReport)
        .set({
          status: input.action === "uphold" ? "upheld" : "dismissed",
          resolvedBy: adminId,
          resolvedAt: new Date(),
        })
        .where(eq(schema.designReport.id, reportId));

      if (input.action === "uphold") {
        await tx
          .update(schema.wallDesign)
          .set({ status: "removed", updatedAt: new Date() })
          .where(eq(schema.wallDesign.id, report.designId));
      }
    });
    return { ok: true };
  }

  private async preview(objectKey: string | undefined): Promise<string | null> {
    if (!objectKey) return null;
    try {
      return await this.storage.presignedGet("uploads", objectKey, 24 * 60 * 60);
    } catch {
      return null;
    }
  }
}
