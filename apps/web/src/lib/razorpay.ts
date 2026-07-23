import type { CreateOrderResult, VerifyPaymentInput } from "@ctrlp/shared";

interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  order_id: string;
  prefill?: { name?: string; email?: string; contact?: string };
  theme?: { color?: string };
  handler: (response: RazorpayResponse) => void;
  modal?: { ondismiss?: () => void };
}

interface RazorpayInstance {
  open: () => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

const SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

function loadScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load Razorpay")));
      return;
    }
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Razorpay"));
    document.body.appendChild(script);
  });
}

/**
 * Drive the payment handshake and resolve with the values the API needs to
 * verify it. In dev mode (order.isLive === false) there is no gateway, so we
 * synthesise the sentinel handshake the API's dev-mode verifier accepts.
 */
export async function runCheckout(
  order: CreateOrderResult,
  customer: { name: string; email?: string; phone?: string },
): Promise<VerifyPaymentInput> {
  if (!order.isLive) {
    return {
      razorpayOrderId: order.razorpayOrderId,
      razorpayPaymentId: `dev_pay_${Date.now()}`,
      razorpaySignature: "dev_signature",
    };
  }

  await loadScript();

  return new Promise<VerifyPaymentInput>((resolve, reject) => {
    if (!window.Razorpay) {
      reject(new Error("Razorpay unavailable"));
      return;
    }
    const rzp = new window.Razorpay({
      key: order.keyId,
      amount: order.amountPaise,
      currency: order.currency,
      name: "ctrlp",
      description: "Poster print order",
      order_id: order.razorpayOrderId,
      prefill: { name: customer.name, email: customer.email, contact: customer.phone },
      theme: { color: "#6d28d9" },
      handler: (response) =>
        resolve({
          razorpayOrderId: response.razorpay_order_id,
          razorpayPaymentId: response.razorpay_payment_id,
          razorpaySignature: response.razorpay_signature,
        }),
      modal: { ondismiss: () => reject(new Error("Payment cancelled")) },
    });
    rzp.open();
  });
}
