import {
  type FrameStyle,
  type Material,
  type PosterSize,
  frameStyleSchema,
  materialSchema,
  posterSizeSchema,
} from "./catalog.js";

/**
 * Pricing matrix — the Phase 0 cost sheet, encoded. All values are integer
 * paise (₹1 = 100 paise); money never touches a float. The server is the
 * single source of truth for prices: clients display these numbers but the
 * order API always recomputes from this table before charging.
 */

/** Base print price (matte, unframed) per size, in paise. */
const BASE_PRINT_PAISE: Record<PosterSize, number> = {
  A4: 14900,
  A3: 24900,
  A2: 44900,
  A1: 69900,
  "12x18": 29900,
  "18x24": 54900,
  "24x36": 99900,
};

/** Material multiplier applied to the base print price. */
const MATERIAL_MULTIPLIER: Record<Material, number> = {
  matte: 1.0,
  glossy: 1.1,
  canvas: 1.5,
};

/** Frame cost per size (paise) for a standard moulding, before style premium. */
const FRAME_BASE_PAISE: Record<PosterSize, number> = {
  A4: 20000,
  A3: 30000,
  A2: 50000,
  A1: 80000,
  "12x18": 35000,
  "18x24": 60000,
  "24x36": 100000,
};

/** Style premium on the frame moulding; `none` means "no frame". */
const FRAME_STYLE_MULTIPLIER: Record<FrameStyle, number> = {
  none: 0,
  black: 1.0,
  white: 1.0,
  "natural-wood": 1.25,
};

/** Orders at or above this subtotal (paise) ship free. */
export const FREE_DELIVERY_THRESHOLD_PAISE = 150000;
/** Flat delivery fee (paise) below the free-delivery threshold. */
export const DELIVERY_FEE_PAISE = 7900;

export interface PriceSpec {
  size: PosterSize;
  material: Material;
  frameStyle: FrameStyle;
}

export interface PriceBreakdown {
  printPaise: number;
  framePaise: number;
  /** Price for a single unit: print + frame. */
  unitPricePaise: number;
}

/** Round to whole paise — prices are stored and charged as integers. */
const toPaise = (n: number): number => Math.round(n);

/** Price one unit of a given spec, itemised. Throws on unknown enum values. */
export function priceUnit(spec: PriceSpec): PriceBreakdown {
  const size = posterSizeSchema.parse(spec.size);
  const material = materialSchema.parse(spec.material);
  const frameStyle = frameStyleSchema.parse(spec.frameStyle);

  const printPaise = toPaise(BASE_PRINT_PAISE[size] * MATERIAL_MULTIPLIER[material]);
  const framePaise = toPaise(FRAME_BASE_PAISE[size] * FRAME_STYLE_MULTIPLIER[frameStyle]);

  return { printPaise, framePaise, unitPricePaise: printPaise + framePaise };
}

/** Convenience: unit price only. */
export function priceUnitPaise(spec: PriceSpec): number {
  return priceUnit(spec).unitPricePaise;
}

export interface CartLine extends PriceSpec {
  quantity: number;
}

export interface OrderTotals {
  subtotalPaise: number;
  deliveryFeePaise: number;
  totalPaise: number;
  lineItems: Array<PriceBreakdown & { quantity: number; lineTotalPaise: number }>;
}

/**
 * Total an entire cart, including the delivery fee. This is the authoritative
 * calculation the order API runs at checkout — the returned `lineItems`
 * mirror the order rows that get persisted.
 */
export function priceCart(lines: readonly CartLine[]): OrderTotals {
  const lineItems = lines.map((line) => {
    const breakdown = priceUnit(line);
    const quantity = Math.max(1, Math.floor(line.quantity));
    return {
      ...breakdown,
      quantity,
      lineTotalPaise: breakdown.unitPricePaise * quantity,
    };
  });

  const subtotalPaise = lineItems.reduce((sum, item) => sum + item.lineTotalPaise, 0);
  const deliveryFeePaise =
    subtotalPaise === 0 || subtotalPaise >= FREE_DELIVERY_THRESHOLD_PAISE
      ? 0
      : DELIVERY_FEE_PAISE;

  return {
    subtotalPaise,
    deliveryFeePaise,
    totalPaise: subtotalPaise + deliveryFeePaise,
    lineItems,
  };
}

/** Format integer paise as a rupee string, e.g. 14900 → "₹149.00". */
export function formatPaise(paise: number): string {
  return `₹${(paise / 100).toFixed(2)}`;
}

/**
 * Default creator commission rate for Wall orders (Phase 0 decision: 10–15%).
 * The API may override via env; this is the fallback and the number the web
 * app shows creators.
 */
export const WALL_COMMISSION_PERCENT = 15;

/**
 * Commission (paise) a creator earns on a paid Wall line item. Clamped to a
 * sane 0–100% and rounded to whole paise. `lineTotalPaise` is unit × quantity.
 */
export function computeCommissionPaise(
  lineTotalPaise: number,
  percent: number = WALL_COMMISSION_PERCENT,
): number {
  const pct = Math.min(100, Math.max(0, percent));
  return Math.round((lineTotalPaise * pct) / 100);
}
