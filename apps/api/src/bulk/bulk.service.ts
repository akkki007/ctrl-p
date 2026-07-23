import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { desc, eq } from "drizzle-orm";
import { DB } from "../db/db.module.js";
import type { Database } from "@ctrlp/db";
import { schema } from "@ctrlp/db";
import {
  type BulkQuoteStatus,
  type BulkQuoteView,
  type CreateBulkQuoteInput,
  type UpdateBulkQuoteInput,
} from "@ctrlp/shared";

type BulkRow = typeof schema.bulkQuote.$inferSelect;

@Injectable()
export class BulkService {
  constructor(@Inject(DB) private readonly db: Database) {}

  /** Public: capture a B2B / bulk enquiry. */
  async create(input: CreateBulkQuoteInput): Promise<{ ok: true }> {
    await this.db.insert(schema.bulkQuote).values({
      company: input.company,
      contactName: input.contactName,
      email: input.email,
      phone: input.phone ?? null,
      quantity: input.quantity,
      details: input.details ?? null,
      status: "new",
    });
    return { ok: true };
  }

  // ── Admin ────────────────────────────────────────────────

  async list(status?: BulkQuoteStatus): Promise<BulkQuoteView[]> {
    const rows = await this.db.query.bulkQuote.findMany({
      where: status ? eq(schema.bulkQuote.status, status) : undefined,
      orderBy: [desc(schema.bulkQuote.createdAt)],
    });
    return rows.map((r) => this.toView(r));
  }

  async update(id: string, input: UpdateBulkQuoteInput, adminId: string): Promise<BulkQuoteView> {
    const found = await this.db.query.bulkQuote.findFirst({
      where: eq(schema.bulkQuote.id, id),
    });
    if (!found) throw new NotFoundException("Quote not found");

    const [row] = await this.db
      .update(schema.bulkQuote)
      .set({
        status: input.status ?? found.status,
        quotedPaise: input.quotedPaise === undefined ? found.quotedPaise : input.quotedPaise,
        adminNote: input.adminNote ?? found.adminNote,
        handledBy: adminId,
        updatedAt: new Date(),
      })
      .where(eq(schema.bulkQuote.id, id))
      .returning();
    return this.toView(row!);
  }

  private toView(r: BulkRow): BulkQuoteView {
    return {
      id: r.id,
      company: r.company,
      contactName: r.contactName,
      email: r.email,
      phone: r.phone,
      quantity: r.quantity,
      details: r.details,
      status: r.status,
      quotedPaise: r.quotedPaise,
      adminNote: r.adminNote,
      createdAt: r.createdAt.toISOString(),
    };
  }
}
