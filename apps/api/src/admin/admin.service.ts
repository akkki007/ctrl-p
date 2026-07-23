import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { desc, eq } from "drizzle-orm";
import { DB } from "../db/db.module.js";
import { NotificationsService } from "../notifications/notifications.service.js";
import { OrdersService } from "../orders/orders.service.js";
import { StorageService } from "../storage/storage.service.js";
import type { Database } from "@ctrlp/db";
import { schema } from "@ctrlp/db";
import {
  type AdminOrderSummary,
  ORDER_STATUS_LABELS,
  type OrderDetail,
  type OrderStatus,
  type UpdateOrderStatusInput,
  canTransition,
} from "@ctrlp/shared";

@Injectable()
export class AdminService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly orders: OrdersService,
    private readonly storage: StorageService,
    private readonly notifications: NotificationsService,
  ) {}

  /** The ops queue — every order, newest first, optionally filtered by status. */
  async listOrders(status?: OrderStatus): Promise<AdminOrderSummary[]> {
    const rows = await this.db.query.order.findMany({
      where: status ? eq(schema.order.status, status) : undefined,
      orderBy: desc(schema.order.createdAt),
      with: {
        items: { with: { asset: true }, limit: 1 },
        user: { columns: { name: true, email: true } },
      },
    });

    return Promise.all(
      rows.map(async (o) => ({
        id: o.id,
        status: o.status,
        paymentStatus: o.paymentStatus,
        totalPaise: o.totalPaise,
        itemCount: o.items.length,
        thumbnailUrl: o.items[0]?.asset
          ? await this.safePreview(o.items[0].asset.objectKey)
          : null,
        createdAt: o.createdAt.toISOString(),
        customerName: o.user?.name ?? "",
        customerEmail: o.user?.email ?? "",
      })),
    );
  }

  getOrder(orderId: string): Promise<OrderDetail> {
    return this.orders.getAnyDetail(orderId);
  }

  /**
   * Advance an order's fulfilment status. The transition is validated against
   * the workflow map and appended to the status-history audit trail. Paid
   * orders only — you can't push an unpaid order down the pipeline.
   */
  async updateStatus(
    orderId: string,
    adminUserId: string,
    input: UpdateOrderStatusInput,
  ): Promise<OrderDetail> {
    const order = await this.db.query.order.findFirst({
      where: eq(schema.order.id, orderId),
      columns: { id: true, userId: true, status: true, paymentStatus: true },
    });
    if (!order) throw new NotFoundException("Order not found");

    if (order.paymentStatus !== "paid") {
      throw new BadRequestException("Order is not paid — cannot change fulfilment status");
    }
    if (order.status === input.status) {
      throw new BadRequestException("Order is already in that status");
    }
    if (!canTransition(order.status, input.status)) {
      throw new BadRequestException(
        `Illegal transition: ${order.status} → ${input.status}`,
      );
    }

    await this.db.transaction(async (tx) => {
      await tx
        .update(schema.order)
        .set({ status: input.status, updatedAt: new Date() })
        .where(eq(schema.order.id, orderId));

      await tx.insert(schema.orderStatusHistory).values({
        orderId,
        status: input.status,
        note: input.note ?? null,
        changedBy: adminUserId,
      });

      await this.notifications.notify(tx, order.userId, {
        type: `order.${input.status}`,
        title: `Order update: ${ORDER_STATUS_LABELS[input.status]}`,
        body: input.note
          ? `Your order is now "${ORDER_STATUS_LABELS[input.status]}". ${input.note}`
          : `Your order is now "${ORDER_STATUS_LABELS[input.status]}".`,
        channels: ["whatsapp"],
      });
    });

    return this.orders.getAnyDetail(orderId);
  }

  /** Presigned download of a line item's original file, for printing. */
  async printFileUrl(orderId: string, itemId: string): Promise<{ url: string }> {
    const item = await this.db.query.orderItem.findFirst({
      where: eq(schema.orderItem.id, itemId),
      with: { asset: true },
    });
    if (!item || item.orderId !== orderId || !item.asset) {
      throw new NotFoundException("Order item not found");
    }
    const url = await this.storage.presignedGet("uploads", item.asset.objectKey, 60 * 60);
    return { url };
  }

  private async safePreview(objectKey: string): Promise<string | null> {
    try {
      return await this.storage.presignedGet("uploads", objectKey);
    } catch {
      return null;
    }
  }
}
