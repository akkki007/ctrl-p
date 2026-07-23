import type { DesignStatus, ReportReason, ReportStatus, WallCategory } from "./wall.js";

/** Public-facing creator identity. */
export interface CreatorPublic {
  handle: string;
  displayName: string;
  bio: string | null;
}

/** A design card in the public gallery. */
export interface WallDesignSummary {
  id: string;
  title: string;
  category: WallCategory;
  tags: string[];
  previewUrl: string | null;
  creator: CreatorPublic;
  orderCount: number;
  createdAt: string;
}

/** Full public design detail. */
export interface WallDesignDetail extends WallDesignSummary {
  description: string | null;
  assetId: string;
  viewCount: number;
}

/** A design as its creator sees it — includes moderation state. */
export interface MyDesign {
  id: string;
  title: string;
  category: WallCategory;
  tags: string[];
  previewUrl: string | null;
  status: DesignStatus;
  rejectionReason: string | null;
  orderCount: number;
  createdAt: string;
}

/** Paginated gallery response. */
export interface WallPage {
  items: WallDesignSummary[];
  page: number;
  pageSize: number;
  total: number;
}

export interface CreatorProfilePage {
  creator: CreatorPublic;
  designs: WallDesignSummary[];
}

// ── Wallet ────────────────────────────────────────────────────────────────

export interface WalletTransactionView {
  id: string;
  amountPaise: number;
  type: "commission" | "payout" | "adjustment";
  description: string;
  createdAt: string;
}

export interface WalletView {
  balancePaise: number;
  transactions: WalletTransactionView[];
}

// ── Admin moderation views ──────────────────────────────────────────────────

export interface AdminDesignSummary extends MyDesign {
  creator: CreatorPublic;
  assetId: string;
  /** Automated-moderation signal — set when the image looks like a duplicate. */
  autoFlagReason: string | null;
}

export interface AdminReportView {
  id: string;
  reason: ReportReason;
  details: string | null;
  status: ReportStatus;
  createdAt: string;
  design: { id: string; title: string; previewUrl: string | null; status: DesignStatus };
}
