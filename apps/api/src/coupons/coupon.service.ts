import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, desc, eq } from "drizzle-orm";
import { DB } from "../db/db.module.js";
import type { DbExecutor } from "../db/tx.js";
import type { Database } from "@ctrlp/db";
import { schema } from "@ctrlp/db";
import {
  type CouponPreview,
  type CouponView,
  type CreateCouponInput,
  type DealView,
  computeCouponDiscountPaise,
} from "@ctrlp/shared";

type CouponRow = typeof schema.coupon.$inferSelect;

@Injectable()
export class CouponService {
  constructor(@Inject(DB) private readonly db: Database) {}

  /**
   * Validate a code against a subtotal for a user and return the coupon row +
   * discount. Throws BadRequest with a human reason if the coupon can't apply.
   * Runs in the given executor so it can share the order transaction.
   */
  async resolveForCart(
    userId: string,
    code: string,
    subtotalPaise: number,
    exec: DbExecutor = this.db,
  ): Promise<{ coupon: CouponRow; discountPaise: number }> {
    const coupon = await exec.query.coupon.findFirst({
      where: eq(schema.coupon.code, code.toUpperCase()),
    });
    if (!coupon || !coupon.active) throw new BadRequestException("Invalid coupon code");

    const now = new Date();
    if (coupon.startsAt && now < coupon.startsAt) {
      throw new BadRequestException("This coupon isn't active yet");
    }
    if (coupon.endsAt && now > coupon.endsAt) {
      throw new BadRequestException("This coupon has expired");
    }
    if (subtotalPaise < coupon.minSubtotalPaise) {
      throw new BadRequestException("Order subtotal is below this coupon's minimum");
    }

    if (coupon.usageLimit != null) {
      const total = await exec.$count(
        schema.couponRedemption,
        eq(schema.couponRedemption.couponId, coupon.id),
      );
      if (total >= coupon.usageLimit) throw new BadRequestException("This coupon is fully redeemed");
    }
    const mine = await exec.$count(
      schema.couponRedemption,
      and(
        eq(schema.couponRedemption.couponId, coupon.id),
        eq(schema.couponRedemption.userId, userId),
      ),
    );
    if (mine >= coupon.perUserLimit) {
      throw new BadRequestException("You've already used this coupon");
    }

    const discountPaise = computeCouponDiscountPaise(coupon, subtotalPaise);
    if (discountPaise <= 0) throw new BadRequestException("This coupon yields no discount here");

    return { coupon, discountPaise };
  }

  /** UX preview for a code against a client-reported subtotal (re-checked at checkout). */
  async preview(userId: string, code: string, subtotalPaise: number): Promise<CouponPreview> {
    const { coupon, discountPaise } = await this.resolveForCart(userId, code, subtotalPaise);
    return { code: coupon.code, discountPaise, description: coupon.description };
  }

  /** Record a redemption inside the order transaction. */
  async recordRedemption(
    exec: DbExecutor,
    couponId: string,
    userId: string,
    orderId: string,
    discountPaise: number,
  ): Promise<void> {
    await exec.insert(schema.couponRedemption).values({
      couponId,
      userId,
      orderId,
      discountPaise,
    });
  }

  async findByCode(code: string, exec: DbExecutor = this.db): Promise<CouponRow | undefined> {
    return exec.query.coupon.findFirst({ where: eq(schema.coupon.code, code.toUpperCase()) });
  }

  /** Auto-apply coupons, surfaced to shoppers as current deals. */
  async deals(): Promise<DealView[]> {
    const now = new Date();
    const rows = await this.db.query.coupon.findMany({
      where: and(eq(schema.coupon.autoApply, true), eq(schema.coupon.active, true)),
    });
    return rows
      .filter((c) => (!c.startsAt || now >= c.startsAt) && (!c.endsAt || now <= c.endsAt))
      .map((c) => ({ code: c.code, description: c.description, type: c.type, value: c.value }));
  }

  // ── Admin ────────────────────────────────────────────────

  async create(input: CreateCouponInput): Promise<CouponView> {
    const existing = await this.findByCode(input.code);
    if (existing) throw new BadRequestException("A coupon with that code already exists");

    const [row] = await this.db
      .insert(schema.coupon)
      .values({
        code: input.code.toUpperCase(),
        description: input.description ?? null,
        type: input.type,
        value: input.value,
        maxDiscountPaise: input.maxDiscountPaise ?? null,
        minSubtotalPaise: input.minSubtotalPaise,
        startsAt: input.startsAt ? new Date(input.startsAt) : null,
        endsAt: input.endsAt ? new Date(input.endsAt) : null,
        usageLimit: input.usageLimit ?? null,
        perUserLimit: input.perUserLimit,
        autoApply: input.autoApply,
        active: input.active,
      })
      .returning();
    if (!row) throw new BadRequestException("Failed to create coupon");
    return this.toView(row, 0);
  }

  async list(): Promise<CouponView[]> {
    const rows = await this.db.query.coupon.findMany({
      orderBy: [desc(schema.coupon.createdAt)],
    });
    return Promise.all(
      rows.map(async (c) => {
        const timesRedeemed = await this.db.$count(
          schema.couponRedemption,
          eq(schema.couponRedemption.couponId, c.id),
        );
        return this.toView(c, timesRedeemed);
      }),
    );
  }

  async setActive(id: string, active: boolean): Promise<{ ok: true }> {
    const found = await this.db.query.coupon.findFirst({
      where: eq(schema.coupon.id, id),
      columns: { id: true },
    });
    if (!found) throw new NotFoundException("Coupon not found");
    await this.db.update(schema.coupon).set({ active }).where(eq(schema.coupon.id, id));
    return { ok: true };
  }

  private toView(c: CouponRow, timesRedeemed: number): CouponView {
    return {
      id: c.id,
      code: c.code,
      description: c.description,
      type: c.type,
      value: c.value,
      maxDiscountPaise: c.maxDiscountPaise,
      minSubtotalPaise: c.minSubtotalPaise,
      startsAt: c.startsAt?.toISOString() ?? null,
      endsAt: c.endsAt?.toISOString() ?? null,
      usageLimit: c.usageLimit,
      perUserLimit: c.perUserLimit,
      autoApply: c.autoApply,
      active: c.active,
      timesRedeemed,
      createdAt: c.createdAt.toISOString(),
    };
  }
}
