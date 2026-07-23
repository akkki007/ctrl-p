import { Inject, Injectable } from "@nestjs/common";
import { desc, eq } from "drizzle-orm";
import { DB } from "../db/db.module.js";
import { StorageService } from "../storage/storage.service.js";
import type { Database } from "@ctrlp/db";
import { schema } from "@ctrlp/db";
import type {
  AnalyticsDashboard,
  AnalyticsKpis,
  BestSellingDesign,
  CreatorLeaderboardEntry,
  RevenuePoint,
} from "@ctrlp/shared";

@Injectable()
export class AnalyticsService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly storage: StorageService,
  ) {}

  async dashboard(): Promise<AnalyticsDashboard> {
    const [kpis, bestSellers, leaderboard, revenueByDay] = await Promise.all([
      this.kpis(),
      this.bestSellers(),
      this.leaderboard(),
      this.revenueByDay(14),
    ]);
    return { kpis, bestSellers, leaderboard, revenueByDay };
  }

  private async kpis(): Promise<AnalyticsKpis> {
    const totalOrders = await this.db.$count(schema.order);
    const publishedDesigns = await this.db.$count(
      schema.wallDesign,
      eq(schema.wallDesign.status, "approved"),
    );

    const paid = await this.db.query.order.findMany({
      where: eq(schema.order.paymentStatus, "paid"),
      columns: { userId: true, totalPaise: true },
      with: { items: { columns: { wallDesignId: true } } },
    });

    const paidOrders = paid.length;
    const revenuePaise = paid.reduce((sum, o) => sum + o.totalPaise, 0);
    const wallOrders = paid.filter((o) => o.items.some((i) => i.wallDesignId)).length;

    const perCustomer = new Map<string, number>();
    for (const o of paid) perCustomer.set(o.userId, (perCustomer.get(o.userId) ?? 0) + 1);

    return {
      totalOrders,
      paidOrders,
      revenuePaise,
      avgOrderValuePaise: paidOrders ? Math.round(revenuePaise / paidOrders) : 0,
      wallOrderShare: paidOrders ? wallOrders / paidOrders : 0,
      totalCustomers: perCustomer.size,
      repeatCustomers: [...perCustomer.values()].filter((n) => n >= 2).length,
      publishedDesigns,
    };
  }

  private async bestSellers(): Promise<BestSellingDesign[]> {
    const rows = await this.db.query.wallDesign.findMany({
      where: eq(schema.wallDesign.status, "approved"),
      orderBy: [desc(schema.wallDesign.orderCount)],
      limit: 8,
      with: { asset: true },
    });
    return Promise.all(
      rows.map(async (d) => ({
        id: d.id,
        title: d.title,
        orderCount: d.orderCount,
        previewUrl: await this.preview(d.asset?.objectKey),
      })),
    );
  }

  private async leaderboard(): Promise<CreatorLeaderboardEntry[]> {
    // Earnings from commission ledger entries, aggregated per creator.
    const commissions = await this.db.query.walletTransaction.findMany({
      where: eq(schema.walletTransaction.type, "commission"),
      columns: { userId: true, amountPaise: true },
    });
    const earnings = new Map<string, number>();
    for (const c of commissions) {
      earnings.set(c.userId, (earnings.get(c.userId) ?? 0) + c.amountPaise);
    }

    // Designs sold per creator (sum of order counts across their designs).
    const designs = await this.db.query.wallDesign.findMany({
      columns: { creatorId: true, orderCount: true },
    });
    const sold = new Map<string, number>();
    for (const d of designs) {
      sold.set(d.creatorId, (sold.get(d.creatorId) ?? 0) + d.orderCount);
    }

    const profiles = await this.db.query.creatorProfile.findMany({
      columns: { userId: true, handle: true, displayName: true },
    });
    const byUser = new Map(profiles.map((p) => [p.userId, p]));

    return [...earnings.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([userId, earningsPaise]) => {
        const p = byUser.get(userId);
        return {
          handle: p?.handle ?? "",
          displayName: p?.displayName ?? "Unknown",
          designsSold: sold.get(userId) ?? 0,
          earningsPaise,
        };
      });
  }

  private async revenueByDay(days: number): Promise<RevenuePoint[]> {
    const paid = await this.db.query.order.findMany({
      where: eq(schema.order.paymentStatus, "paid"),
      columns: { totalPaise: true, paidAt: true },
    });

    const byDate = new Map<string, { revenuePaise: number; orders: number }>();
    for (const o of paid) {
      if (!o.paidAt) continue;
      const key = o.paidAt.toISOString().slice(0, 10);
      const cur = byDate.get(key) ?? { revenuePaise: 0, orders: 0 };
      cur.revenuePaise += o.totalPaise;
      cur.orders += 1;
      byDate.set(key, cur);
    }

    const out: RevenuePoint[] = [];
    const today = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setUTCDate(d.getUTCDate() - i);
      const key = d.toISOString().slice(0, 10);
      const entry = byDate.get(key);
      out.push({ date: key, revenuePaise: entry?.revenuePaise ?? 0, orders: entry?.orders ?? 0 });
    }
    return out;
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
