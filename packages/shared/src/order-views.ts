import type { FrameStyle, Material, PosterSize } from "./catalog.js";
import type { ShippingAddress } from "./checkout.js";
import type { OrderStatus, PaymentStatus } from "./order.js";

/** One configured poster within an order, with a preview URL for display. */
export interface OrderItemView {
  id: string;
  assetId: string;
  previewUrl: string | null;
  size: PosterSize;
  material: Material;
  frameStyle: FrameStyle;
  quantity: number;
  unitPricePaise: number;
}

/** A single entry in the order's status audit trail. */
export interface OrderStatusEvent {
  status: OrderStatus;
  note: string | null;
  createdAt: string;
}

/** Compact order representation for list views. */
export interface OrderSummary {
  id: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  totalPaise: number;
  itemCount: number;
  thumbnailUrl: string | null;
  createdAt: string;
}

/** Full order representation for the tracking / detail page. */
export interface OrderDetail extends OrderSummary {
  subtotalPaise: number;
  deliveryFeePaise: number;
  discountPaise: number;
  couponCode: string | null;
  couponDiscountPaise: number;
  pointsRedeemed: number;
  pointsDiscountPaise: number;
  pointsEarned: number;
  shippingAddress: ShippingAddress;
  /** Fulfilment routing + shipment tracking (Phase 4). */
  hubCity: string | null;
  courierName: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  items: OrderItemView[];
  history: OrderStatusEvent[];
}

/** Order summary enriched with customer identity for the ops queue. */
export interface AdminOrderSummary extends OrderSummary {
  customerName: string;
  customerEmail: string;
}

/** Returned by POST /orders — everything the browser needs to open checkout. */
export interface CreateOrderResult {
  orderId: string;
  razorpayOrderId: string;
  amountPaise: number;
  currency: string;
  keyId: string;
  /** False when the API is running Razorpay in dev mode. */
  isLive: boolean;
}
