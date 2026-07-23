/**
 * Typed client for the ctrlp API. Every request sends credentials so the
 * better-auth session cookie rides along cross-origin (web :3000 → api :3001).
 */
import type {
  AdminOrderSummary,
  AssetMetadata,
  CreateOrderInput,
  CreateOrderResult,
  FinalizeAssetInput,
  OrderDetail,
  OrderStatus,
  OrderSummary,
  UpdateOrderStatusInput,
  UploadIntentInput,
  UploadIntentResult,
  VerifyPaymentInput,
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
