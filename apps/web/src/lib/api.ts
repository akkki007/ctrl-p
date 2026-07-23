/**
 * Typed client for the ctrlp API. Every request sends credentials so the
 * better-auth session cookie rides along cross-origin (web :3000 → api :3001).
 */
import type {
  AdminDesignSummary,
  AdminOrderSummary,
  AdminPayoutView,
  AdminReportView,
  AnalyticsDashboard,
  AssetMetadata,
  BulkQuoteStatus,
  BulkQuoteView,
  CreateBulkQuoteInput,
  CreateHubInput,
  HubView,
  ServiceabilityResult,
  UpdateBulkQuoteInput,
  UpdateHubInput,
  CouponPreview,
  CouponView,
  CreateCouponInput,
  CreateOrderInput,
  CreateOrderResult,
  CreatorProfilePage,
  DealView,
  DesignStatus,
  FinalizeAssetInput,
  LoyaltyView,
  ModerateDesignInput,
  MyDesign,
  NotificationFeed,
  OrderDetail,
  OrderStatus,
  OrderSummary,
  PayoutRequestView,
  PayoutStatus,
  ProcessPayoutInput,
  PublishDesignInput,
  ReferralView,
  ReportDesignInput,
  ReportStatus,
  RequestPayoutInput,
  ResolveReportInput,
  UpdateOrderStatusInput,
  UploadIntentInput,
  UploadIntentResult,
  VerifyPaymentInput,
  WalletView,
  WallDesignDetail,
  WallPage,
  WallQuery,
} from "@ctrlp/shared";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      body = await res.text().catch(() => undefined);
    }
    const message =
      (body && typeof body === "object" && "message" in body
        ? String((body as { message: unknown }).message)
        : undefined) ?? `Request failed (${res.status})`;
    throw new ApiError(message, res.status, body);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  // ── assets ────────────────────────────────────────────────
  uploadIntent: (body: UploadIntentInput) =>
    request<UploadIntentResult>("/assets/upload-intent", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  finalizeAsset: (body: FinalizeAssetInput) =>
    request<AssetMetadata>("/assets/finalize", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  // ── orders ────────────────────────────────────────────────
  createOrder: (body: CreateOrderInput) =>
    request<CreateOrderResult>("/orders", { method: "POST", body: JSON.stringify(body) }),

  verifyPayment: (orderId: string, body: VerifyPaymentInput) =>
    request<OrderDetail>(`/orders/${orderId}/verify-payment`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  listOrders: () => request<OrderSummary[]>("/orders"),
  getOrder: (id: string) => request<OrderDetail>(`/orders/${id}`),

  // ── admin ─────────────────────────────────────────────────
  adminListOrders: (status?: OrderStatus) =>
    request<AdminOrderSummary[]>(`/admin/orders${status ? `?status=${status}` : ""}`),

  adminGetOrder: (id: string) => request<OrderDetail>(`/admin/orders/${id}`),

  adminUpdateStatus: (id: string, body: UpdateOrderStatusInput) =>
    request<OrderDetail>(`/admin/orders/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  adminPrintFile: (orderId: string, itemId: string) =>
    request<{ url: string }>(`/admin/orders/${orderId}/items/${itemId}/print-file`),

  // ── wall / marketplace ────────────────────────────────────
  listWall: (query: Partial<WallQuery> = {}) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== "") params.set(key, String(value));
    }
    const qs = params.toString();
    return request<WallPage>(`/wall${qs ? `?${qs}` : ""}`);
  },

  getDesign: (id: string) => request<WallDesignDetail>(`/wall/${id}`),

  publishDesign: (body: PublishDesignInput) =>
    request<MyDesign>("/wall", { method: "POST", body: JSON.stringify(body) }),

  myDesigns: () => request<MyDesign[]>("/wall/mine"),

  unpublishDesign: (id: string) =>
    request<{ ok: true }>(`/wall/${id}`, { method: "DELETE" }),

  reportDesign: (id: string, body: ReportDesignInput) =>
    request<{ ok: true }>(`/wall/${id}/report`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  getCreator: (handle: string) => request<CreatorProfilePage>(`/creators/${handle}`),

  getWallet: () => request<WalletView>("/wallet"),

  // ── admin moderation ──────────────────────────────────────
  adminListDesigns: (status?: DesignStatus) =>
    request<AdminDesignSummary[]>(`/admin/designs${status ? `?status=${status}` : ""}`),

  adminModerate: (id: string, body: ModerateDesignInput) =>
    request<{ ok: true }>(`/admin/designs/${id}/moderate`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  adminListReports: (status?: ReportStatus) =>
    request<AdminReportView[]>(`/admin/reports${status ? `?status=${status}` : ""}`),

  adminResolveReport: (id: string, body: ResolveReportInput) =>
    request<{ ok: true }>(`/admin/reports/${id}/resolve`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  // ── loyalty / coupons / deals ─────────────────────────────
  getLoyalty: () => request<LoyaltyView>("/loyalty"),
  listDeals: () => request<DealView[]>("/coupons/deals"),
  previewCoupon: (code: string, subtotalPaise: number) =>
    request<CouponPreview>("/coupons/preview", {
      method: "POST",
      body: JSON.stringify({ code, subtotalPaise }),
    }),

  // ── payouts ───────────────────────────────────────────────
  getPayouts: () => request<PayoutRequestView[]>("/payouts"),
  requestPayout: (body: RequestPayoutInput) =>
    request<PayoutRequestView>("/payouts", { method: "POST", body: JSON.stringify(body) }),

  // ── referrals ─────────────────────────────────────────────
  getReferral: () => request<ReferralView>("/referrals"),
  claimReferral: (code: string) =>
    request<{ ok: true }>("/referrals/claim", {
      method: "POST",
      body: JSON.stringify({ code }),
    }),

  // ── notifications ─────────────────────────────────────────
  getNotifications: () => request<NotificationFeed>("/notifications"),
  markNotificationsRead: (id?: string) =>
    request<{ ok: true }>("/notifications/read", {
      method: "POST",
      body: JSON.stringify({ id }),
    }),

  // ── admin: coupons + payouts ──────────────────────────────
  adminListCoupons: () => request<CouponView[]>("/admin/coupons"),
  adminCreateCoupon: (body: CreateCouponInput) =>
    request<CouponView>("/admin/coupons", { method: "POST", body: JSON.stringify(body) }),
  adminSetCouponActive: (id: string, active: boolean) =>
    request<{ ok: true }>(`/admin/coupons/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ active }),
    }),
  adminListPayouts: (status?: PayoutStatus) =>
    request<AdminPayoutView[]>(`/admin/payouts${status ? `?status=${status}` : ""}`),
  adminProcessPayout: (id: string, body: ProcessPayoutInput) =>
    request<PayoutRequestView>(`/admin/payouts/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  // ── delivery / B2B ────────────────────────────────────────
  checkDelivery: (pincode: string) =>
    request<ServiceabilityResult>("/delivery/check", {
      method: "POST",
      body: JSON.stringify({ pincode }),
    }),
  createBulkQuote: (body: CreateBulkQuoteInput) =>
    request<{ ok: true }>("/bulk-quotes", { method: "POST", body: JSON.stringify(body) }),

  // ── admin: analytics / hubs / quotes ──────────────────────
  adminAnalytics: () => request<AnalyticsDashboard>("/admin/analytics"),
  adminListHubs: () => request<HubView[]>("/admin/hubs"),
  adminCreateHub: (body: CreateHubInput) =>
    request<HubView>("/admin/hubs", { method: "POST", body: JSON.stringify(body) }),
  adminUpdateHub: (id: string, body: UpdateHubInput) =>
    request<HubView>(`/admin/hubs/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  adminListQuotes: (status?: BulkQuoteStatus) =>
    request<BulkQuoteView[]>(`/admin/bulk-quotes${status ? `?status=${status}` : ""}`),
  adminUpdateQuote: (id: string, body: UpdateBulkQuoteInput) =>
    request<BulkQuoteView>(`/admin/bulk-quotes/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
};

/** PUT the raw file bytes to a presigned MinIO URL (no credentials/JSON). */
export async function putToPresignedUrl(url: string, file: File): Promise<void> {
  const res = await fetch(url, {
    method: "PUT",
    body: file,
    headers: { "content-type": file.type },
  });
  if (!res.ok) {
    throw new ApiError(`Upload failed (${res.status})`, res.status);
  }
}
