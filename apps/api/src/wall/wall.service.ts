import { randomBytes } from "node:crypto";
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, arrayContains, desc, eq, ilike, sql } from "drizzle-orm";
import { DB } from "../db/db.module.js";
import { StorageService } from "../storage/storage.service.js";
import type { Database } from "@ctrlp/db";
import { schema } from "@ctrlp/db";
import {
  type CreatorProfilePage,
  type MyDesign,
  type PublishDesignInput,
  type ReportDesignInput,
  SIMILARITY_THRESHOLD,
  type WalletView,
  type WallCategory,
  type WallDesignDetail,
  type WallDesignSummary,
  type WallPage,
  type WallQuery,
  hammingDistanceHex,
} from "@ctrlp/shared";

type DesignRow = typeof schema.wallDesign.$inferSelect;
type ProfileRow = typeof schema.creatorProfile.$inferSelect;
type AssetRow = typeof schema.asset.$inferSelect;

@Injectable()
export class WallService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly storage: StorageService,
  ) {}

  /**
   * Publish a creator-owned asset to the Wall. Requires the originality
   * declaration; lands in `pending` for manual moderation. Lazily creates the
   * creator's public profile on first publish.
   */
  async publish(userId: string, input: PublishDesignInput): Promise<MyDesign> {
    const asset = await this.db.query.asset.findFirst({
      where: and(eq(schema.asset.id, input.assetId), eq(schema.asset.ownerId, userId)),
    });
    if (!asset) throw new BadRequestException("You can only publish your own uploads");

    await this.ensureProfile(userId);

    const autoFlagReason = await this.detectDuplicate(input.assetId, asset.phash);

    const [row] = await this.db
      .insert(schema.wallDesign)
      .values({
        creatorId: userId,
        assetId: input.assetId,
        title: input.title,
        description: input.description ?? null,
        category: input.category,
        tags: input.tags,
        status: "pending",
        originalityDeclared: new Date(),
        autoFlagReason,
      })
      .returning();

    if (!row) throw new BadRequestException("Failed to publish design");
    return this.toMyDesign(row, asset);
  }

  /** Public gallery of approved designs, filtered/sorted/paginated. */
  async gallery(query: WallQuery): Promise<WallPage> {
    const filters = [eq(schema.wallDesign.status, "approved")];
    if (query.category) filters.push(eq(schema.wallDesign.category, query.category));
    if (query.tag) filters.push(arrayContains(schema.wallDesign.tags, [query.tag]));
    if (query.q) filters.push(ilike(schema.wallDesign.title, `%${query.q}%`));
    const where = and(...filters);

    const total = await this.db.$count(schema.wallDesign, where);

    const rows = await this.db.query.wallDesign.findMany({
      where,
      orderBy:
        query.sort === "popular"
          ? [desc(schema.wallDesign.orderCount), desc(schema.wallDesign.createdAt)]
          : [desc(schema.wallDesign.createdAt)],
      limit: query.pageSize,
      offset: (query.page - 1) * query.pageSize,
      with: { asset: true, creatorProfile: true },
    });

    const items = await Promise.all(
      rows.map((r) => this.toSummary(r, r.asset, r.creatorProfile)),
    );
    return { items, page: query.page, pageSize: query.pageSize, total };
  }

  /** Public design detail. Bumps the view counter. */
  async getDesign(id: string): Promise<WallDesignDetail> {
    const row = await this.db.query.wallDesign.findFirst({
      where: eq(schema.wallDesign.id, id),
      with: { asset: true, creatorProfile: true },
    });
    if (!row || row.status !== "approved") {
      throw new NotFoundException("Design not found");
    }

    await this.db
      .update(schema.wallDesign)
      .set({ viewCount: sql`${schema.wallDesign.viewCount} + 1` })
      .where(eq(schema.wallDesign.id, id));

    const summary = await this.toSummary(row, row.asset, row.creatorProfile);
    return {
      ...summary,
      description: row.description,
      assetId: row.assetId,
      viewCount: row.viewCount + 1,
    };
  }

  /** All of a creator's designs, any status. */
  async myDesigns(userId: string): Promise<MyDesign[]> {
    const rows = await this.db.query.wallDesign.findMany({
      where: eq(schema.wallDesign.creatorId, userId),
      orderBy: [desc(schema.wallDesign.createdAt)],
      with: { asset: true },
    });
    return Promise.all(rows.map((r) => this.toMyDesign(r, r.asset)));
  }

  /** Creator-initiated takedown. */
  async unpublish(userId: string, id: string): Promise<{ ok: true }> {
    const row = await this.db.query.wallDesign.findFirst({
      where: eq(schema.wallDesign.id, id),
      columns: { id: true, creatorId: true },
    });
    if (!row) throw new NotFoundException("Design not found");
    if (row.creatorId !== userId) throw new ForbiddenException("Not your design");

    await this.db
      .update(schema.wallDesign)
      .set({ status: "removed", updatedAt: new Date() })
      .where(eq(schema.wallDesign.id, id));
    return { ok: true };
  }

  /** Public creator profile + their approved designs. */
  async creatorByHandle(handle: string): Promise<CreatorProfilePage> {
    const profile = await this.db.query.creatorProfile.findFirst({
      where: eq(schema.creatorProfile.handle, handle),
    });
    if (!profile) throw new NotFoundException("Creator not found");

    const rows = await this.db.query.wallDesign.findMany({
      where: and(
        eq(schema.wallDesign.creatorId, profile.userId),
        eq(schema.wallDesign.status, "approved"),
      ),
      orderBy: [desc(schema.wallDesign.createdAt)],
      with: { asset: true },
    });

    return {
      creator: this.publicCreator(profile),
      designs: await Promise.all(rows.map((r) => this.toSummary(r, r.asset, profile))),
    };
  }

  /** Creator wallet: ledger balance + transaction history. */
  async wallet(userId: string): Promise<WalletView> {
    const txns = await this.db.query.walletTransaction.findMany({
      where: eq(schema.walletTransaction.userId, userId),
      orderBy: [desc(schema.walletTransaction.createdAt)],
    });
    const balancePaise = txns.reduce((sum, t) => sum + t.amountPaise, 0);
    return {
      balancePaise,
      transactions: txns.map((t) => ({
        id: t.id,
        amountPaise: t.amountPaise,
        type: t.type,
        description: t.description,
        createdAt: t.createdAt.toISOString(),
      })),
    };
  }

  /** File a copyright/abuse report against a design. */
  async reportDesign(
    reporterId: string,
    designId: string,
    input: ReportDesignInput,
  ): Promise<{ ok: true }> {
    const design = await this.db.query.wallDesign.findFirst({
      where: eq(schema.wallDesign.id, designId),
      columns: { id: true },
    });
    if (!design) throw new NotFoundException("Design not found");

    await this.db.insert(schema.designReport).values({
      designId,
      reporterId,
      reason: input.reason,
      details: input.details ?? null,
      status: "open",
    });
    return { ok: true };
  }

  // ── helpers ────────────────────────────────────────────────

  /**
   * Automated moderation: compare a new upload's perceptual hash against every
   * live/pending design and return a flag reason if it looks like a near-
   * duplicate. Cheap linear scan — fine at launch scale; swap for an index
   * (or reverse-image API) when the catalogue grows.
   */
  private async detectDuplicate(
    assetId: string,
    phash: string | null,
  ): Promise<string | null> {
    if (!phash) return null;

    const existing = await this.db.query.wallDesign.findMany({
      where: (d, { and: whereAnd, ne, inArray }) =>
        whereAnd(
          ne(d.assetId, assetId),
          inArray(d.status, ["approved", "pending"]),
        ),
      columns: { id: true, title: true },
      with: { asset: { columns: { phash: true } } },
    });

    let best: { title: string; distance: number } | null = null;
    for (const d of existing) {
      const distance = hammingDistanceHex(phash, d.asset?.phash);
      if (distance <= SIMILARITY_THRESHOLD && (!best || distance < best.distance)) {
        best = { title: d.title, distance };
      }
    }

    return best
      ? `Possible near-duplicate of "${best.title}" (similarity distance ${best.distance}).`
      : null;
  }

  /** Find or create the caller's creator profile with a unique handle. */
  private async ensureProfile(userId: string): Promise<ProfileRow> {
    const existing = await this.db.query.creatorProfile.findFirst({
      where: eq(schema.creatorProfile.userId, userId),
    });
    if (existing) return existing;

    const user = await this.db.query.user.findFirst({
      where: eq(schema.user.id, userId),
      columns: { name: true, email: true },
    });
    const displayName = user?.name?.trim() || user?.email?.split("@")[0] || "Creator";
    const handle = await this.uniqueHandle(displayName);

    const [created] = await this.db
      .insert(schema.creatorProfile)
      .values({ userId, handle, displayName })
      .returning();
    if (!created) throw new BadRequestException("Failed to create creator profile");
    return created;
  }

  private async uniqueHandle(seed: string): Promise<string> {
    const base =
      seed
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 24) || "creator";

    for (let attempt = 0; attempt < 6; attempt++) {
      const candidate = attempt === 0 ? base : `${base}-${randomBytes(2).toString("hex")}`;
      const clash = await this.db.query.creatorProfile.findFirst({
        where: eq(schema.creatorProfile.handle, candidate),
        columns: { userId: true },
      });
      if (!clash) return candidate;
    }
    return `${base}-${randomBytes(4).toString("hex")}`;
  }

  private publicCreator(profile: ProfileRow) {
    return { handle: profile.handle, displayName: profile.displayName, bio: profile.bio };
  }

  private async preview(objectKey: string | undefined): Promise<string | null> {
    if (!objectKey) return null;
    try {
      return await this.storage.presignedGet("uploads", objectKey, 24 * 60 * 60);
    } catch {
      return null;
    }
  }

  private async toSummary(
    row: DesignRow,
    asset: AssetRow | null | undefined,
    profile: ProfileRow | null | undefined,
  ): Promise<WallDesignSummary> {
    return {
      id: row.id,
      title: row.title,
      category: row.category as WallCategory,
      tags: row.tags,
      previewUrl: await this.preview(asset?.objectKey),
      creator: profile
        ? this.publicCreator(profile)
        : { handle: "", displayName: "Unknown", bio: null },
      orderCount: row.orderCount,
      createdAt: row.createdAt.toISOString(),
    };
  }

  private async toMyDesign(
    row: DesignRow,
    asset: AssetRow | null | undefined,
  ): Promise<MyDesign> {
    return {
      id: row.id,
      title: row.title,
      category: row.category as WallCategory,
      tags: row.tags,
      previewUrl: await this.preview(asset?.objectKey),
      status: row.status,
      rejectionReason: row.rejectionReason,
      orderCount: row.orderCount,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
