/** Admin analytics dashboard view types (Phase 4). All money in paise. */

export interface AnalyticsKpis {
  totalOrders: number;
  paidOrders: number;
  revenuePaise: number;
  avgOrderValuePaise: number;
  /** Share of paid orders that included at least one Wall design (0–1). */
  wallOrderShare: number;
  totalCustomers: number;
  repeatCustomers: number;
  publishedDesigns: number;
}

export interface BestSellingDesign {
  id: string;
  title: string;
  orderCount: number;
  previewUrl: string | null;
}

export interface CreatorLeaderboardEntry {
  handle: string;
  displayName: string;
  designsSold: number;
  earningsPaise: number;
}

export interface RevenuePoint {
  date: string; // YYYY-MM-DD
  revenuePaise: number;
  orders: number;
}

export interface AnalyticsDashboard {
  kpis: AnalyticsKpis;
  bestSellers: BestSellingDesign[];
  leaderboard: CreatorLeaderboardEntry[];
  revenueByDay: RevenuePoint[];
}
