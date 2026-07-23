import { randomBytes } from "node:crypto";
import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { and, eq, isNull } from "drizzle-orm";
import { DB } from "../db/db.module.js";
import type { DbExecutor, DbTx } from "../db/tx.js";
import { LoyaltyService } from "../loyalty/loyalty.service.js";
import { NotificationsService } from "../notifications/notifications.service.js";
import type { Database } from "@ctrlp/db";
import { schema } from "@ctrlp/db";
import { REFERRAL_POINTS, type ReferralView } from "@ctrlp/shared";

@Injectable()
export class ReferralService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly loyalty: LoyaltyService,
    private readonly notifications: NotificationsService,
  ) {}

  /** The caller's referral code, created on first access. */
  async getOrCreateCode(userId: string): Promise<string> {
    const existing = await this.db.query.referralCode.findFirst({
      where: eq(schema.referralCode.userId, userId),
    });
    if (existing) return existing.code;

    for (let attempt = 0; attempt < 8; attempt++) {
      const code = randomBytes(4).toString("hex").toUpperCase().slice(0, 6);
      const clash = await this.db.query.referralCode.findFirst({
        where: eq(schema.referralCode.code, code),
        columns: { userId: true },
      });
      if (!clash) {
        await this.db.insert(schema.referralCode).values({ userId, code });
        return code;
      }
    }
    throw new BadRequestException("Could not allocate a referral code, try again");
  }

  async view(userId: string): Promise<ReferralView> {
    const code = await this.getOrCreateCode(userId);
    const referred = await this.db.query.referral.findMany({
      where: eq(schema.referral.referrerId, userId),
      columns: { rewardedAt: true },
    });
    const mine = await this.db.query.referral.findFirst({
      where: eq(schema.referral.refereeId, userId),
    });

    let referredBy: string | null = null;
    if (mine) {
      const ref = await this.db.query.user.findFirst({
        where: eq(schema.user.id, mine.referrerId),
        columns: { name: true },
      });
      referredBy = ref?.name ?? "a friend";
    }

    return {
      code,
      referredCount: referred.length,
      rewardedCount: referred.filter((r) => r.rewardedAt != null).length,
      pointsPerReferral: REFERRAL_POINTS,
      referredBy,
    };
  }

  /** Attach the caller to a referrer. One claim per user; no self-referral. */
  async claim(userId: string, code: string): Promise<{ ok: true }> {
    const owner = await this.db.query.referralCode.findFirst({
      where: eq(schema.referralCode.code, code.toUpperCase()),
    });
    if (!owner) throw new BadRequestException("Invalid referral code");
    if (owner.userId === userId) throw new BadRequestException("You can't refer yourself");

    const already = await this.db.query.referral.findFirst({
      where: eq(schema.referral.refereeId, userId),
      columns: { refereeId: true },
    });
    if (already) throw new BadRequestException("You've already used a referral code");

    await this.db.insert(schema.referral).values({
      refereeId: userId,
      referrerId: owner.userId,
      code: code.toUpperCase(),
    });
    return { ok: true };
  }

  /**
   * Reward both parties the first time a referee's order is paid. Idempotent:
   * guarded by `rewardedAt`. Runs inside the order-payment transaction.
   */
  async rewardOnFirstOrder(tx: DbTx, refereeId: string): Promise<void> {
    const ref = await tx.query.referral.findFirst({
      where: and(eq(schema.referral.refereeId, refereeId), isNull(schema.referral.rewardedAt)),
    });
    if (!ref) return;

    await tx
      .update(schema.referral)
      .set({ rewardedAt: new Date() })
      .where(eq(schema.referral.refereeId, refereeId));

    await this.loyalty.credit(tx, ref.referrerId, REFERRAL_POINTS, "referral", "Referral reward");
    await this.loyalty.credit(tx, refereeId, REFERRAL_POINTS, "referral", "Welcome referral bonus");

    await this.notifications.notify(tx as DbExecutor, ref.referrerId, {
      type: "referral.rewarded",
      title: "You earned referral points! 🎉",
      body: `A friend you referred placed their first order — ${REFERRAL_POINTS} points added.`,
    });
    await this.notifications.notify(tx as DbExecutor, refereeId, {
      type: "referral.rewarded",
      title: "Referral bonus added 🎁",
      body: `${REFERRAL_POINTS} points landed in your account. Enjoy!`,
    });
  }
}
