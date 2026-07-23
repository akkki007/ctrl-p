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
- [ ] Auth (email/phone + OAuth)
- [ ] Image upload with resolution check (warn if too low for chosen size)
- [ ] Customizer: size, material, frame style + live price + mockup preview
- [ ] Cart + checkout (Razorpay/UPI)
- [ ] Order tracking: Placed → Printing → Framing → QC → Shipped → Delivered
- [ ] Admin panel: order queue, status updates, download print-ready file

**Ops**
- [ ] Printing + framing setup operational
- [ ] Delivery: local courier / Dunzo-style partner for launch city
- [ ] QC checklist per order

**Suggested stack:** Next.js + Postgres (Supabase/Neon) + S3-compatible storage for images + Razorpay. Keep it boring and fast.

**Exit criteria:** 25–50 paid orders, repeat customers exist, ≤2% reprint rate.

---

## Phase 2 — Wall of Frames Marketplace (4–5 weeks)

**Goal:** Turn customers into creators; affiliate flywheel begins.

- [ ] "Publish to Wall" toggle at upload (with originality declaration)
- [ ] Public gallery: browse, search, categories/tags
- [ ] Order any wall design → owner gets x% credited to in-platform wallet
- [ ] Creator wallet: balance, transaction history
- [ ] Moderation queue: manual review before a design goes public (automate later)
- [ ] Report/takedown flow for copyright complaints
- [ ] Creator profile pages (shareable link — creators market themselves = free acquisition)

**Exit criteria:** 100+ published designs, ≥20% of orders come from the Wall.

---

## Phase 3 — Loyalty, Discounts & Payouts (3–4 weeks)

**Goal:** Retention + closing the money loop for creators.

- [ ] Loyalty points: earn per order, redeem as discount at checkout
- [ ] Cash redemption for wallet balances: threshold (e.g. ₹500 min), KYC, payout via UPI — check tax/legal implications first
- [ ] Discount engine: weekly deals, seasonal campaigns (Diwali, New Year, Valentine's), coupon codes
- [ ] Email/WhatsApp notifications: order updates, wallet credits, deal alerts
- [ ] Referral program (optional): points for inviting friends

**Exit criteria:** ≥25% repeat purchase rate, first successful creator payouts.

---

## Phase 4 — Scale & Polish (ongoing)

**Goal:** Grow beyond launch city, reduce manual work.

- [ ] Second fulfillment hub / courier integration for wider delivery
- [ ] Automated moderation (image similarity + reverse-image search for copyright flags)
- [ ] Analytics dashboard: best-selling designs, creator leaderboard, cohort retention
- [ ] Mobile app (or PWA) if web traction justifies it
- [ ] Bulk/B2B orders: cafés, offices, gifting
- [ ] SEO + creator-driven social content as primary growth channels

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