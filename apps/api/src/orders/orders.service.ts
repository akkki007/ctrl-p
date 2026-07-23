import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { ConfigService } from "@nestjs/config";
import { DB } from "../db/db.module.js";
import { CouponService } from "../coupons/coupon.service.js";
import { LoyaltyService } from "../loyalty/loyalty.service.js";
import { NotificationsService } from "../notifications/notifications.service.js";
import { PaymentsService } from "../payments/payments.service.js";
import { ReferralService } from "../referrals/referral.service.js";
import { HubService } from "../shipping/hub.service.js";
import { StorageService } from "../storage/storage.service.js";
import { formatPaise } from "@ctrlp/shared";
import type { Database } from "@ctrlp/db";
import type { DbTx } from "../db/tx.js";
import { schema } from "@ctrlp/db";
import {
  type CreateOrderInput,
  type CreateOrderResult,
  type OrderDetail,
  type OrderSummary,
  type ShippingAddress,
  type VerifyPaymentInput,
  WALL_COMMISSION_PERCENT,
  computeCommissionPaise,
  computeOrderTotals,
  maxRedeemablePoints,
  pointsEarned,
  pointsValuePaise,
  priceCart,
  shippingAddressSchema,
} from "@ctrlp/shared";

@Injectable()
export class OrdersService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly payments: PaymentsService,
    private readonly storage: StorageService,
    private readonly config: ConfigService,
    private readonly loyalty: LoyaltyService,
    private readonly coupons: CouponService,
    private readonly referrals: ReferralService,
    private readonly notifications: NotificationsService,
    private readonly hubs: HubService,
  ) {}

  /**
   * Create an order from a cart. Prices are recomputed server-side from the
   * pricing matrix — the client's numbers are never trusted.
   *
   * Two kinds of line item:
   * - **Own upload** (no `wallDesignId`): the asset must belong to the caller.
   * - **Wall design** (`wallDesignId` set): the design must be `approved` and
   *   its asset must match the item's asset. Ownership is NOT required — that's
   *   the whole point of ordering someone else's design.
   *
   * Persists the order + items in one transaction, then opens a Razorpay order.
   */
  async create(userId: string, input: CreateOrderInput): Promise<CreateOrderResult> {
    // Own uploads must belong to the caller.
    const ownAssetIds = [
      ...new Set(input.items.filter((i) => !i.wallDesignId).map((i) => i.assetId)),
    ];
    if (ownAssetIds.length > 0) {
      const owned = await this.db.query.asset.findMany({
        where: and(inArray(schema.asset.id, ownAssetIds), eq(schema.asset.ownerId, userId)),
        columns: { id: true },
      });
      if (owned.length !== ownAssetIds.length) {
        throw new BadRequestException("One or more images were not found in your uploads");
      }
    }

    // Wall designs must exist, be approved, and match the item's asset.
    const wallDesignIds = [
      ...new Set(
        input.items.map((i) => i.wallDesignId).filter((id): id is string => Boolean(id)),
      ),
    ];
    if (wallDesignIds.length > 0) {
      const designs = await this.db.query.wallDesign.findMany({
        where: inArray(schema.wallDesign.id, wallDesignIds),
        columns: { id: true, assetId: true, status: true },
      });
      const byId = new Map(designs.map((d) => [d.id, d]));
      for (const item of input.items) {
        if (!item.wallDesignId) continue;
        const design = byId.get(item.wallDesignId);
        if (!design || design.status !== "approved") {
          throw new BadRequestException("A selected Wall design is no longer available");
        }
        if (design.assetId !== item.assetId) {
          throw new BadRequestException("Wall design image mismatch");
        }
      }
    }

    // Delivery routing: a hub must serve the destination PIN code.
    const hub = await this.hubs.resolveHub(input.shippingAddress.pincode);
    if (!hub) {
      throw new BadRequestException(
        `We don't deliver to ${input.shippingAddress.pincode} yet — check back soon!`,
      );
    }

    const cart = priceCart(input.items);
    const subtotalPaise = cart.subtotalPaise;

    // Coupon (validated, not yet redeemed — redemption is recorded on payment).
    let couponCode: string | null = null;
    let couponDiscountPaise = 0;
    if (input.couponCode) {
      const resolved = await this.coupons.resolveForCart(userId, input.couponCode, subtotalPaise);
      couponCode = resolved.coupon.code;
      couponDiscountPaise = resolved.discountPaise;
    }

    // Points redemption, capped to balance and the 50%-of-subtotal rule.
    const balance = await this.loyalty.balance(userId);
    const pointsRedeemed = Math.min(
      input.pointsToRedeem,
      maxRedeemablePoints(subtotalPaise, balance),
    );
    // Don't let points value exceed what's left after the coupon.
    const pointsDiscountPaise = Math.min(
      pointsValuePaise(pointsRedeemed),
      Math.max(0, subtotalPaise - couponDiscountPaise),
    );

    const totals = computeOrderTotals({
      subtotalPaise,
      deliveryFeePaise: cart.deliveryFeePaise,
      couponDiscountPaise,
      pointsDiscountPaise,
    });
    const eligiblePaise = Math.max(0, subtotalPaise - totals.discountPaise);
    const earned = pointsEarned(eligiblePaise);

    const rzpOrder = await this.payments.createOrder(
      totals.totalPaise,
      `ctrlp_${Date.now()}`,
    );

    const orderId = await this.db.transaction(async (tx) => {
      const [order] = await tx
        .insert(schema.order)
        .values({
          userId,
          status: "placed",
          paymentStatus: "pending",
          subtotalPaise: totals.subtotalPaise,
          deliveryFeePaise: totals.deliveryFeePaise,
          discountPaise: totals.discountPaise,
          couponCode,
          couponDiscountPaise,
          pointsRedeemed,
          pointsDiscountPaise,
          pointsEarned: earned,
          totalPaise: totals.totalPaise,
          razorpayOrderId: rzpOrder.id,
          shippingAddress: JSON.stringify(input.shippingAddress),
          hubId: hub.id,
          hubCity: hub.city,
        })
        .returning({ id: schema.order.id });

      if (!order) throw new BadRequestException("Failed to create order");

      await tx.insert(schema.orderItem).values(
        input.items.map((item, idx) => ({
          orderId: order.id,
          assetId: item.assetId,
          wallDesignId: item.wallDesignId ?? null,
          size: item.size,
          material: item.material,
          frameStyle: item.frameStyle,
          quantity: item.quantity,
          unitPricePaise: cart.lineItems[idx]!.unitPricePaise,
        })),
      );

      return order.id;
    });

    return {
      orderId,
      razorpayOrderId: rzpOrder.id,
      amountPaise: totals.totalPaise,
      currency: rzpOrder.currency,
      keyId: this.payments.publicKeyId,
      isLive: this.payments.isLive,
    };
  }

  /**
   * Verify the Razorpay handshake and confirm the order. On a bad signature the
   * order's payment is marked failed and the call rejects. On success the order
   * is marked paid and its first status-history entry is written.
   */
  async verifyPayment(
    userId: string,
    orderId: string,
    input: VerifyPaymentInput,
  ): Promise<OrderDetail> {
    const order = await this.db.query.order.findFirst({
      where: and(eq(schema.order.id, orderId), eq(schema.order.userId, userId)),
    });
    if (!order) throw new NotFoundException("Order not found");
    if (order.paymentStatus === "paid") return this.getForUser(userId, orderId);
    if (order.razorpayOrderId !== input.razorpayOrderId) {
      throw new BadRequestException("Payment does not match this order");
    }

    const valid = this.payments.verifySignature(
      input.razorpayOrderId,
      input.razorpayPaymentId,
      input.razorpaySignature,
    );

    if (!valid) {
      await this.db
        .update(schema.order)
        .set({ paymentStatus: "failed", updatedAt: new Date() })
        .where(eq(schema.order.id, orderId));
      throw new BadRequestException("Payment signature verification failed");
    }

    await this.db.transaction(async (tx) => {
      await tx
        .update(schema.order)
        .set({
          paymentStatus: "paid",
          paidAt: new Date(),
          razorpayPaymentId: input.razorpayPaymentId,
          updatedAt: new Date(),
        })
        .where(eq(schema.order.id, orderId));

      await tx.insert(schema.orderStatusHistory).values({
        orderId,
        status: "placed",
        note: "Payment confirmed — order placed",
        changedBy: userId,
      });

      await this.creditWallCommissions(tx, orderId, userId);

      // Loyalty: earn on the eligible amount, and spend any redeemed points.
      if (order.pointsEarned > 0) {
        await this.loyalty.credit(tx, userId, order.pointsEarned, "earn", "Order reward", orderId);
      }
      if (order.pointsRedeemed > 0) {
        await this.loyalty.redeem(tx, userId, order.pointsRedeemed, "Redeemed at checkout", orderId);
      }

      // Coupon: record the redemption now that the order is paid.
      if (order.couponCode && order.couponDiscountPaise > 0) {
        const coupon = await this.coupons.findByCode(order.couponCode, tx);
        if (coupon) {
          await this.coupons.recordRedemption(
            tx,
            coupon.id,
            userId,
            orderId,
            order.couponDiscountPaise,
          );
        }
      }

      // Referral: reward both parties if this is the referee's first paid order.
      await this.referrals.rewardOnFirstOrder(tx, userId);

      // Confirmation notification (in-app + email).
      await this.notifications.notify(tx, userId, {
        type: "order.placed",
        title: "Order confirmed 🎉",
        body: `We've received your order (${formatPaise(order.totalPaise)}). We'll start printing shortly.`,
        channels: ["email"],
      });
    });

    return this.getForUser(userId, orderId);
  }

  /**
   * Credit creator commissions for every Wall line item in a just-paid order,
   * and bump each design's order counter. Creators earn nothing on their own
   * designs (no self-commission). Runs inside the payment transaction so a
   * commission can never exist without a paid order.
   */
  private async creditWallCommissions(
    tx: Parameters<Parameters<Database["transaction"]>[0]>[0],
    orderId: string,
    buyerId: string,
  ): Promise<void> {
    const items = await tx.query.orderItem.findMany({
      where: eq(schema.orderItem.orderId, orderId),
      with: { wallDesign: { columns: { id: true, creatorId: true, title: true } } },
    });

    const percent = this.commissionPercent();

    for (const item of items) {
      if (!item.wallDesignId || !item.wallDesign) continue;

      await tx
        .update(schema.wallDesign)
        .set({ orderCount: sql`${schema.wallDesign.orderCount} + ${item.quantity}` })
        .where(eq(schema.wallDesign.id, item.wallDesignId));

      if (item.wallDesign.creatorId === buyerId) continue; // no self-commission

      const commission = computeCommissionPaise(item.unitPricePaise * item.quantity, percent);
      if (commission <= 0) continue;

      await tx.insert(schema.walletTransaction).values({
        userId: item.wallDesign.creatorId,
        amountPaise: commission,
        type: "commission",
        description: `Commission — "${item.wallDesign.title}"`,
        orderId,
        designId: item.wallDesignId,
      });

      await this.notifications.notify(tx, item.wallDesign.creatorId, {
        type: "wallet.credited",
        title: "You earned a commission 💸",
        body: `${formatPaise(commission)} for "${item.wallDesign.title}".`,
      });
    }
  }

  private commissionPercent(): number {
    const raw = Number(this.config.get<string>("COMMISSION_PERCENT"));
    return Number.isFinite(raw) && raw > 0 ? raw : WALL_COMMISSION_PERCENT;
  }

  /** List the caller's orders, newest first, with a thumbnail per order. */
  async listForUser(userId: string): Promise<OrderSummary[]> {
    const orders = await this.db.query.order.findMany({
      where: eq(schema.order.userId, userId),
      orderBy: desc(schema.order.createdAt),
      with: { items: { with: { asset: true }, limit: 1 } },
    });

    return Promise.all(
      orders.map(async (o) => ({
        id: o.id,
        status: o.status,
        paymentStatus: o.paymentStatus,
        totalPaise: o.totalPaise,
        itemCount: o.items.length,
        thumbnailUrl: await this.previewUrlFor(o.items[0]?.asset?.objectKey),
        createdAt: o.createdAt.toISOString(),
      })),
    );
  }

  /** Full order detail for the owner, including items and status history. */
  async getForUser(userId: string, orderId: string): Promise<OrderDetail> {
    const order = await this.db.query.order.findFirst({
      where: and(eq(schema.order.id, orderId), eq(schema.order.userId, userId)),
      with: {
        items: { with: { asset: true } },
        history: { orderBy: (h, { asc }) => asc(h.createdAt) },
      },
    });
    if (!order) throw new NotFoundException("Order not found");
    return this.toDetail(order);
  }

  /** Full order detail with no owner scoping — admin use only. */
  async getAnyDetail(orderId: string): Promise<OrderDetail> {
    const order = await this.db.query.order.findFirst({
      where: eq(schema.order.id, orderId),
      with: {
        items: { with: { asset: true } },
        history: { orderBy: (h, { asc }) => asc(h.createdAt) },
      },
    });
    if (!order) throw new NotFoundException("Order not found");
    return this.toDetail(order);
  }

  private async toDetail(
    order: NonNullable<Awaited<ReturnType<OrdersService["loadWithRelations"]>>>,
  ): Promise<OrderDetail> {
    const items = await Promise.all(
      order.items.map(async (item) => ({
        id: item.id,
        assetId: item.assetId,
        previewUrl: await this.previewUrlFor(item.asset?.objectKey),
        size: item.size as OrderDetail["items"][number]["size"],
        material: item.material as OrderDetail["items"][number]["material"],
        frameStyle: item.frameStyle as OrderDetail["items"][number]["frameStyle"],
        quantity: item.quantity,
        unitPricePaise: item.unitPricePaise,
      })),
    );

    return {
      id: order.id,
      status: order.status,
      paymentStatus: order.paymentStatus,
      totalPaise: order.totalPaise,
      subtotalPaise: order.subtotalPaise,
      deliveryFeePaise: order.deliveryFeePaise,
      discountPaise: order.discountPaise,
      couponCode: order.couponCode,
      couponDiscountPaise: order.couponDiscountPaise,
      pointsRedeemed: order.pointsRedeemed,
      pointsDiscountPaise: order.pointsDiscountPaise,
      pointsEarned: order.pointsEarned,
      hubCity: order.hubCity,
      courierName: order.courierName,
      trackingNumber: order.trackingNumber,
      trackingUrl: order.trackingUrl,
      itemCount: items.length,
      thumbnailUrl: items[0]?.previewUrl ?? null,
      shippingAddress: parseAddress(order.shippingAddress),
      items,
      history: order.history.map((h) => ({
        status: h.status,
        note: h.note,
        createdAt: h.createdAt.toISOString(),
      })),
      createdAt: order.createdAt.toISOString(),
    };
  }

  /** Type anchor for the relational payload shape used by {@link toDetail}. */
  private loadWithRelations(orderId: string) {
    return this.db.query.order.findFirst({
      where: eq(schema.order.id, orderId),
      with: { items: { with: { asset: true } }, history: true },
    });
  }

  private async previewUrlFor(objectKey: string | undefined): Promise<string | null> {
    if (!objectKey) return null;
    try {
      return await this.storage.presignedGet("uploads", objectKey, 24 * 60 * 60);
    } catch {
      return null;
    }
  }
}

function parseAddress(raw: string): ShippingAddress {
  try {
    return shippingAddressSchema.parse(JSON.parse(raw));
  } catch {
    // Legacy/free-form addresses degrade gracefully rather than 500.
    return {
      fullName: "",
      phone: "",
      line1: raw,
      city: "",
      state: "",
      pincode: "",
    };
  }
}
