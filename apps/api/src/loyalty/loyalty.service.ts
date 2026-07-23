import { Inject, Injectable } from "@nestjs/common";
import { desc, eq } from "drizzle-orm";
import { DB } from "../db/db.module.js";
import type { DbExecutor } from "../db/tx.js";
import type { Database } from "@ctrlp/db";
import { schema } from "@ctrlp/db";
import type { LoyaltyView } from "@ctrlp/shared";

type LoyaltyType = "earn" | "redeem" | "referral" | "adjustment";

/**
 * Loyalty points ledger. Balance is the sum of a user's entries; every earn,
 * redemption, and referral reward is an append-only row. Mutating methods take
 * an executor so they can run inside the order-payment transaction.
 */
@Injectable()
export class LoyaltyService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async balance(userId: string, exec: DbExecutor = this.db): Promise<number> {
    const rows = await exec.query.loyaltyTransaction.findMany({
      where: eq(schema.loyaltyTransaction.userId, userId),
      columns: { points: true },
    });
    return rows.reduce((sum, r) => sum + r.points, 0);
  }

  async view(userId: string): Promise<LoyaltyView> {
    const txns = await this.db.query.loyaltyTransaction.findMany({
      where: eq(schema.loyaltyTransaction.userId, userId),
      orderBy: [desc(schema.loyaltyTransaction.createdAt)],
    });
    return {
      balance: txns.reduce((sum, t) => sum + t.points, 0),
      transactions: txns.map((t) => ({
        id: t.id,
        points: t.points,
        type: t.type,
        description: t.description,
        createdAt: t.createdAt.toISOString(),
      })),
    };
  }

  /** Add points (earn/referral/adjustment). No-op for non-positive amounts. */
  async credit(
    exec: DbExecutor,
    userId: string,
    points: number,
    type: LoyaltyType,
    description: string,
    orderId?: string,
  ): Promise<void> {
    if (points <= 0) return;
    await exec.insert(schema.loyaltyTransaction).values({
      userId,
      points,
      type,
      description,
      orderId: orderId ?? null,
    });
  }

  /**
   * Spend points as a checkout discount. Caps to the current balance so the
   * ledger can never go negative. Returns the number actually redeemed.
   */
  async redeem(
    exec: DbExecutor,
    userId: string,
    points: number,
    description: string,
    orderId?: string,
  ): Promise<number> {
    if (points <= 0) return 0;
    const balance = await this.balance(userId, exec);
    const actual = Math.min(points, balance);
    if (actual <= 0) return 0;

    await exec.insert(schema.loyaltyTransaction).values({
      userId,
      points: -actual,
      type: "redeem",
      description,
      orderId: orderId ?? null,
    });
    return actual;
  }
}
