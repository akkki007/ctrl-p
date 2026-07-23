import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { desc, eq } from "drizzle-orm";
import { DB } from "../db/db.module.js";
import { NotificationsService } from "../notifications/notifications.service.js";
import type { DbExecutor } from "../db/tx.js";
import type { Database } from "@ctrlp/db";
import { schema } from "@ctrlp/db";
import {
  type AdminPayoutView,
  MIN_PAYOUT_PAISE,
  type PayoutRequestView,
  type PayoutStatus,
  type ProcessPayoutInput,
  type RequestPayoutInput,
  formatPaise,
} from "@ctrlp/shared";

type PayoutRow = typeof schema.payoutRequest.$inferSelect;

@Injectable()
export class PayoutService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly notifications: NotificationsService,
  ) {}

  private async walletBalance(userId: string, exec: DbExecutor = this.db): Promise<number> {
    const rows = await exec.query.walletTransaction.findMany({
      where: eq(schema.walletTransaction.userId, userId),
      columns: { amountPaise: true },
    });
    return rows.reduce((sum, r) => sum + r.amountPaise, 0);
  }

  /**
   * Request a cash payout. Funds are held immediately by debiting the wallet
   * ledger, so the same balance can't be requested twice; a rejection refunds
   * them. Enforces the ₹500 minimum and available-balance ceiling.
   */
  async request(userId: string, input: RequestPayoutInput): Promise<PayoutRequestView> {
    if (input.amountPaise < MIN_PAYOUT_PAISE) {
      throw new BadRequestException(`Minimum payout is ₹${MIN_PAYOUT_PAISE / 100}`);
    }

    const row = await this.db.transaction(async (tx) => {
      const balance = await this.walletBalance(userId, tx);
      if (input.amountPaise > balance) {
        throw new BadRequestException("Amount exceeds your wallet balance");
      }

      const [created] = await tx
        .insert(schema.payoutRequest)
        .values({
          userId,
          amountPaise: input.amountPaise,
          status: "requested",
          upiId: input.upiId,
          panLast4: input.panLast4 ?? null,
        })
        .returning();
      if (!created) throw new BadRequestException("Failed to create payout request");

      // Hold the funds.
      await tx.insert(schema.walletTransaction).values({
        userId,
        amountPaise: -input.amountPaise,
        type: "payout",
        description: `Payout requested → ${input.upiId}`,
      });

      return created;
    });

    return this.toView(row);
  }

  async myRequests(userId: string): Promise<PayoutRequestView[]> {
    const rows = await this.db.query.payoutRequest.findMany({
      where: eq(schema.payoutRequest.userId, userId),
      orderBy: [desc(schema.payoutRequest.createdAt)],
    });
    return rows.map((r) => this.toView(r));
  }

  // ── Admin ────────────────────────────────────────────────

  async listAll(status?: PayoutStatus): Promise<AdminPayoutView[]> {
    const rows = await this.db.query.payoutRequest.findMany({
      where: status ? eq(schema.payoutRequest.status, status) : undefined,
      orderBy: [desc(schema.payoutRequest.createdAt)],
      with: { user: { columns: { name: true, email: true } } },
    });
    return rows.map((r) => ({
      ...this.toView(r),
      userId: r.userId,
      customerName: r.user?.name ?? "",
      customerEmail: r.user?.email ?? "",
      panLast4: r.panLast4,
    }));
  }

  /**
   * Admin decision. `approve` and `pay` advance the request; `reject` refunds
   * the held funds to the wallet. Terminal states can't be re-processed.
   */
  async process(
    adminId: string,
    id: string,
    input: ProcessPayoutInput,
  ): Promise<PayoutRequestView> {
    const row = await this.db.query.payoutRequest.findFirst({
      where: eq(schema.payoutRequest.id, id),
    });
    if (!row) throw new NotFoundException("Payout request not found");
    if (row.status === "paid" || row.status === "rejected") {
      throw new BadRequestException("This payout has already been finalised");
    }

    const nextStatus: PayoutStatus =
      input.action === "approve" ? "approved" : input.action === "pay" ? "paid" : "rejected";

    const updated = await this.db.transaction(async (tx) => {
      const [u] = await tx
        .update(schema.payoutRequest)
        .set({
          status: nextStatus,
          note: input.note ?? row.note,
          processedBy: adminId,
          processedAt: new Date(),
        })
        .where(eq(schema.payoutRequest.id, id))
        .returning();

      if (input.action === "reject") {
        // Refund the held funds.
        await tx.insert(schema.walletTransaction).values({
          userId: row.userId,
          amountPaise: row.amountPaise,
          type: "adjustment",
          description: "Payout rejected — refunded",
        });
      }

      const body =
        nextStatus === "paid"
          ? `${formatPaise(row.amountPaise)} has been paid to ${row.upiId}.`
          : nextStatus === "approved"
            ? `Your payout of ${formatPaise(row.amountPaise)} was approved and is being processed.`
            : `Your payout request was rejected and ${formatPaise(row.amountPaise)} was returned to your wallet.`;
      await this.notifications.notify(tx, row.userId, {
        type: `payout.${nextStatus}`,
        title: `Payout ${nextStatus}`,
        body,
        channels: ["email"],
      });
      return u!;
    });

    return this.toView(updated);
  }

  private toView(r: PayoutRow): PayoutRequestView {
    return {
      id: r.id,
      amountPaise: r.amountPaise,
      status: r.status,
      upiId: r.upiId,
      note: r.note,
      createdAt: r.createdAt.toISOString(),
      processedAt: r.processedAt?.toISOString() ?? null,
    };
  }
}
