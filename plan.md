# Poster Printing Platform — Phased Plan

**Model:** Upload → in-house print + frame → deliver, plus "Wall of Frames" creator affiliate marketplace.
**Rule of thumb:** each phase ships something usable and validates one assumption before the next phase starts.

---

## Phase 0 — Validation & Groundwork (2–3 weeks)

**Goal:** Confirm the idea is worth building before writing product code.

- [ ] Expert review of concept pitch (Notion doc) → lock decisions on:
  - Affiliate commission % (e.g. 10–15%)
  - Loyalty points mechanics (earn rate, redemption rules)
  - Launch city + delivery radius
- [ ] Pricing matrix: size × material × frame → cost sheet with margins
- [ ] Printing setup estimate: printer, framing tools, materials, workspace (capex + per-unit cost)
- [ ] Copyright/moderation policy draft (takedown process, originality declaration at upload)
- [ ] 10–15 customer interviews (students, home decor buyers) — would they pay? at what price?

**Exit criteria:** validated pricing, known unit economics, launch city chosen.

---

## Phase 1 — MVP: Print-Your-Own (4–6 weeks)

**Goal:** A working store — upload, customize, pay, deliver. No marketplace yet.

**Product**
- [x] Auth (email + Google OAuth; phone OTP still pending)
- [x] Image upload with resolution check (warn if too low for chosen size)
- [x] Customizer: size, material, frame style + live price + mockup preview
- [x] Cart + checkout (Razorpay/UPI)
- [x] Order tracking: Placed → Printing → Framing → QC → Shipped → Delivered
- [x] Admin panel: order queue, status updates, download print-ready file

**Ops**
- [ ] Printing + framing setup operational
- [ ] Delivery: local courier / Dunzo-style partner for launch city
- [ ] QC checklist per order

**Suggested stack:** Next.js + Postgres (Supabase/Neon) + S3-compatible storage for images + Razorpay. Keep it boring and fast.

**Exit criteria:** 25–50 paid orders, repeat customers exist, ≤2% reprint rate.

---

## Phase 2 — Wall of Frames Marketplace (4–5 weeks)

**Goal:** Turn customers into creators; affiliate flywheel begins.

- [x] "Publish to Wall" toggle at upload (with originality declaration)
- [x] Public gallery: browse, search, categories/tags
- [x] Order any wall design → owner gets x% credited to in-platform wallet
- [x] Creator wallet: balance, transaction history
- [x] Moderation queue: manual review before a design goes public (automate later)
- [x] Report/takedown flow for copyright complaints
- [x] Creator profile pages (shareable link — creators market themselves = free acquisition)

**Exit criteria:** 100+ published designs, ≥20% of orders come from the Wall.

---

## Phase 3 — Loyalty, Discounts & Payouts (3–4 weeks)

**Goal:** Retention + closing the money loop for creators.

- [x] Loyalty points: earn per order, redeem as discount at checkout
- [x] Cash redemption for wallet balances: threshold (₹500 min), KYC (PAN), payout via UPI — legal/tax review still required before enabling real payouts
- [x] Discount engine: coupon codes + auto-apply deals (seasonal campaigns via date windows)
- [x] Email/WhatsApp notifications: in-app feed live; email/WhatsApp via a log transport (wire real provider before launch)
- [x] Referral program: shareable code, both parties earn points on referee's first paid order

**Exit criteria:** ≥25% repeat purchase rate, first successful creator payouts.

---

## Phase 4 — Scale & Polish (ongoing)

**Goal:** Grow beyond launch city, reduce manual work.

- [x] Second fulfillment hub / courier integration for wider delivery — multi-hub routing by PIN code + mock courier (real courier API is a drop-in)
- [x] Automated moderation (image similarity) — perceptual-hash near-duplicate flagging at publish (reverse-image search API still to add)
- [x] Analytics dashboard: best-selling designs, creator leaderboard, KPIs + revenue trend (repeat-rate proxy for cohort retention)
- [x] PWA: installable manifest + offline app-shell service worker
- [x] Bulk/B2B orders: cafés, offices, gifting — public quote form + admin quoting workflow
- [x] SEO + creator-driven social: sitemap/robots/OG metadata + Web-Share buttons on designs & creator pages

---

## Risks to Watch

| Risk | Mitigation |
|---|---|
| Copyright uploads on the Wall | Manual review (P2) → automated flagging (P4), clear takedown policy |
| Cash redemption legality/tax | Legal consult in Phase 0/3 before enabling payouts |
| Print quality inconsistency | QC checklist from day 1; reprint guarantee |
| Capex before demand proof | Keep Phase 1 setup minimal; upgrade equipment after exit criteria met |
| Delivery damage (glass frames) | Packaging spec + insurance with courier partner |

---

## Sequencing Logic

1. **Store before marketplace** — no point in affiliate mechanics without proven order flow and unit economics.
2. **Marketplace before loyalty** — the Wall is the differentiator; loyalty amplifies retention only once there's something to retain.
3. **Manual before automated** — moderate and QC by hand until volume forces automation.