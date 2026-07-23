import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DELIVERY_FEE_PAISE,
  FREE_DELIVERY_THRESHOLD_PAISE,
  canTransition,
  checkResolution,
  priceCart,
  priceUnit,
} from "../dist/index.js";

test("priceUnit: matte unframed is the base price", () => {
  const { printPaise, framePaise, unitPricePaise } = priceUnit({
    size: "A4",
    material: "matte",
    frameStyle: "none",
  });
  assert.equal(printPaise, 14900);
  assert.equal(framePaise, 0);
  assert.equal(unitPricePaise, 14900);
});

test("priceUnit: material multiplier and framed style premium stack", () => {
  const { printPaise, framePaise, unitPricePaise } = priceUnit({
    size: "A3",
    material: "canvas", // 1.5x
    frameStyle: "natural-wood", // 1.25x on 30000 frame base
  });
  assert.equal(printPaise, Math.round(24900 * 1.5)); // 37350
  assert.equal(framePaise, Math.round(30000 * 1.25)); // 37500
  assert.equal(unitPricePaise, 37350 + 37500);
});

test("priceCart: charges delivery below the free threshold", () => {
  const totals = priceCart([
    { assetId: "x", size: "A4", material: "matte", frameStyle: "none", quantity: 1 },
  ]);
  assert.equal(totals.subtotalPaise, 14900);
  assert.equal(totals.deliveryFeePaise, DELIVERY_FEE_PAISE);
  assert.equal(totals.totalPaise, 14900 + DELIVERY_FEE_PAISE);
});

test("priceCart: free delivery at/above the threshold", () => {
  const totals = priceCart([
    { assetId: "x", size: "A1", material: "matte", frameStyle: "natural-wood", quantity: 1 },
  ]);
  assert.ok(totals.subtotalPaise >= FREE_DELIVERY_THRESHOLD_PAISE);
  assert.equal(totals.deliveryFeePaise, 0);
  assert.equal(totals.totalPaise, totals.subtotalPaise);
});

test("priceCart: quantity multiplies the line total", () => {
  const totals = priceCart([
    { assetId: "x", size: "A4", material: "glossy", frameStyle: "none", quantity: 3 },
  ]);
  const unit = priceUnit({ size: "A4", material: "glossy", frameStyle: "none" }).unitPricePaise;
  assert.equal(totals.lineItems[0].lineTotalPaise, unit * 3);
});

test("checkResolution: flags low-DPI images and clears sharp ones", () => {
  // 500x500 on A3 → well under 150 DPI on the long edge.
  assert.equal(checkResolution(500, 500, "A3").ok, false);
  // 4000x6000 easily clears A4.
  const hi = checkResolution(4000, 6000, "A4");
  assert.equal(hi.ok, true);
  assert.ok(hi.dpi >= 150);
});

test("checkResolution: orientation does not change the verdict", () => {
  const landscape = checkResolution(3000, 2000, "A3");
  const portrait = checkResolution(2000, 3000, "A3");
  assert.equal(landscape.dpi, portrait.dpi);
});

test("canTransition: enforces the fulfilment workflow", () => {
  assert.equal(canTransition("placed", "printing"), true);
  assert.equal(canTransition("qc", "printing"), true); // reprint bounce-back
  assert.equal(canTransition("placed", "delivered"), false);
  assert.equal(canTransition("delivered", "shipped"), false);
});
