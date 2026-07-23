import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export interface RazorpayOrder {
  id: string;
  amountPaise: number;
  currency: string;
}

/**
 * Razorpay integration using the REST API directly (no SDK dependency).
 *
 * When RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are unset, the service runs in
 * **dev mode**: it mints fake order ids and accepts a dev signature, so the
 * whole checkout flow works locally without live credentials. Never deploy
 * without the keys — {@link isLive} gates real charging.
 */
@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly keyId?: string;
  private readonly keySecret?: string;

  constructor(config: ConfigService) {
    this.keyId = config.get<string>("RAZORPAY_KEY_ID") || undefined;
    this.keySecret = config.get<string>("RAZORPAY_KEY_SECRET") || undefined;
    if (!this.isLive) {
      this.logger.warn("Razorpay keys not set — running payments in DEV MODE (no real charges)");
    }
  }

  get isLive(): boolean {
    return Boolean(this.keyId && this.keySecret);
  }

  /** Publishable key id the browser checkout widget needs (dev sentinel otherwise). */
  get publicKeyId(): string {
    return this.keyId ?? "rzp_test_dev_mode";
  }

  /** Create a Razorpay order for the given amount (paise). */
  async createOrder(amountPaise: number, receipt: string): Promise<RazorpayOrder> {
    if (!this.isLive) {
      return { id: `dev_order_${randomUUID()}`, amountPaise, currency: "INR" };
    }

    const auth = Buffer.from(`${this.keyId}:${this.keySecret}`).toString("base64");
    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Basic ${auth}` },
      body: JSON.stringify({ amount: amountPaise, currency: "INR", receipt }),
    });

    if (!res.ok) {
      const detail = await res.text();
      this.logger.error(`Razorpay order creation failed: ${res.status} ${detail}`);
      throw new Error("Payment gateway error");
    }

    const data = (await res.json()) as { id: string; amount: number; currency: string };
    return { id: data.id, amountPaise: data.amount, currency: data.currency };
  }

  /**
   * Verify the checkout handshake. Live mode checks the HMAC-SHA256 signature
   * over `${orderId}|${paymentId}`; dev mode accepts the sentinel signature
   * `dev_signature` so local flows can complete.
   */
  verifySignature(orderId: string, paymentId: string, signature: string): boolean {
    if (!this.isLive) {
      return signature === "dev_signature";
    }

    const expected = createHmac("sha256", this.keySecret!)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    return a.length === b.length && timingSafeEqual(a, b);
  }
}
