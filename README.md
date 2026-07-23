# ctrlp — Poster Printing Platform

Upload → in-house print + frame → deliver, plus a "Wall of Frames" creator affiliate marketplace. See [plan.md](./plan.md) for the phased roadmap.

## Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js (App Router, Tailwind) — `apps/web` |
| API | NestJS — `apps/api` |
| Database | Self-hosted Postgres 17 + Drizzle ORM — `packages/db` |
| Object storage | MinIO (S3-compatible, self-hosted) — print files never live in Postgres |
| Auth | better-auth (self-hosted, tables in Postgres, mounted on the API) |
| Jobs | Redis + BullMQ (image processing, notifications) — wiring lands with Phase 1 features |
| Payments | Razorpay (Phase 1 checkout) |
| Monorepo | pnpm workspaces + Turborepo |

## Layout

```
apps/
  web/        Next.js storefront
  api/        NestJS API (auth mounted at /api/auth, health at /health)
packages/
  db/         Drizzle schema + migrations + db client
  shared/     Shared types & zod schemas (order statuses, catalog enums)
docker-compose.yml   Postgres, Redis, MinIO (+ bucket bootstrap)
```

## Getting started

```bash
cp .env.example .env          # then set BETTER_AUTH_SECRET (openssl rand -base64 32)
pnpm install
pnpm infra:up                 # postgres :5432, redis :6379, minio :9000 (console :9001)
pnpm db:generate && pnpm db:migrate
pnpm dev                      # web :3000, api :3001
```

Health check: `curl localhost:3001/health`

## Phase 1 — Print-Your-Own (built)

The full upload → customise → pay → track → fulfil flow is implemented.

**Web (`apps/web`)**

| Route | What it does |
|---|---|
| `/` | Landing page |
| `/sign-in`, `/sign-up` | Email/password + Google auth (better-auth) |
| `/create` | Upload with resolution check, live customiser (size × material × frame), price + framed mockup |
| `/cart` | Cart, delivery address, Razorpay checkout |
| `/orders`, `/orders/[id]` | Order history + tracking timeline |
| `/admin`, `/admin/orders/[id]` | Ops queue, status transitions, print-file download (admin-only) |

**API (`apps/api`)**

| Endpoint | Auth | Purpose |
|---|---|---|
| `POST /assets/upload-intent` | session | Presigned MinIO PUT for the original file |
| `POST /assets/finalize` | session | Confirm upload, read dimensions (sharp) + checksum, persist metadata |
| `POST /orders` | session | Create order — **prices recomputed server-side** — + Razorpay order |
| `POST /orders/:id/verify-payment` | session | Verify Razorpay signature, confirm order |
| `GET /orders`, `GET /orders/:id` | session | List / track own orders |
| `GET /admin/orders` | admin | Order queue (`?status=` filter) |
| `PATCH /admin/orders/:id/status` | admin | Advance fulfilment status (validated transitions) |
| `GET /admin/orders/:id/items/:itemId/print-file` | admin | Presigned print-file download |

**Key rules**

- **Prices are authoritative on the server.** The client displays the pricing matrix (`@ctrlp/shared`), but the order API always recomputes every amount before charging.
- **Image dimensions are read server-side** at finalize, so the print-quality (DPI) check can't be spoofed.
- **Payments run in dev mode** when `RAZORPAY_KEY_*` are unset — the checkout flow completes end-to-end locally without live credentials.
- **Admin access** is an `ADMIN_EMAILS` allowlist (env). The better-auth admin plugin / a role column can replace this later.

Pricing, DPI, and status-transition logic are unit-tested: `pnpm --filter @ctrlp/shared test`.

## Phase 2 — Wall of Frames marketplace (built)

Customers become creators: publish a design, others order it, the creator earns commission.

**Web (`apps/web`)**

| Route | What it does |
|---|---|
| `/wall` | Public gallery — search, category filter, sort (newest/popular), pagination |
| `/wall/[id]` | Design detail → order it (prefilled customiser) + report flow |
| `/create` | Upload now includes a **Publish to Wall** panel with originality declaration |
| `/studio` | Creator dashboard — wallet balance + activity, your designs and their moderation state |
| `/creators/[handle]` | Public, shareable creator page |
| `/admin/moderation`, `/admin/reports` | Approve/reject designs; uphold (take down) or dismiss reports |

**API (`apps/api`)**

| Endpoint | Auth | Purpose |
|---|---|---|
| `GET /wall` | public | Gallery of approved designs (`q`, `category`, `tag`, `sort`, `page`) |
| `GET /wall/:id` | public | Design detail (bumps view count) |
| `POST /wall` | session | Publish own asset (originality required → `pending` for review) |
| `GET /wall/mine`, `DELETE /wall/:id` | session | Manage own designs |
| `POST /wall/:id/report` | session | File a copyright/abuse report |
| `GET /creators/:handle` | public | Creator profile + approved designs |
| `GET /wallet` | session | Ledger balance + transactions |
| `GET /admin/designs`, `PATCH /admin/designs/:id/moderate` | admin | Moderation queue |
| `GET /admin/reports`, `PATCH /admin/reports/:id/resolve` | admin | Report resolution |

**Key rules**

- **Moderation first.** Designs land in `pending`; only `approved` designs are publicly visible and orderable.
- **Commission is server-computed** (`COMMISSION_PERCENT`, default 15%) and credited to the creator's wallet ledger **inside the payment transaction** — a commission can't exist without a paid order. No self-commission.
- **Ordering a Wall design** relaxes the ownership check for that item but verifies the design is approved and its asset matches; own-upload items still require ownership.
- **Wallet is an append-only ledger**; balance is the sum of entries. Cash payouts (debits) arrive in Phase 3.
- **Creator profiles** are created lazily on first publish, with an auto-generated unique handle.

## Phase 3 — Loyalty, discounts & payouts (built)

Retention mechanics and the creator money-loop.

**Web (`apps/web`)**

| Route | What it does |
|---|---|
| `/cart` | Coupon code + points-redemption slider with live totals |
| `/rewards` | Loyalty balance/history, creator wallet + UPI payout request, referral code + claim |
| `/notifications` | In-app feed (nav bell shows unread count) |
| `/admin/coupons`, `/admin/payouts` | Create/toggle coupons; approve/pay/reject payout requests |

**API (`apps/api`)**

| Endpoint | Auth | Purpose |
|---|---|---|
| `GET /loyalty` | session | Points balance + ledger |
| `GET /coupons/deals`, `POST /coupons/preview` | public / session | Current deals; validate a code against a cart |
| `GET/POST /payouts` | session | List + request cash payouts (₹500 min, UPI + PAN) |
| `GET /referrals`, `POST /referrals/claim` | session | Referral code + claim a friend's code |
| `GET /notifications`, `POST /notifications/read` | session | Feed + mark read |
| `POST/GET/PATCH /admin/coupons` | admin | Coupon CRUD + activate/deactivate |
| `GET/PATCH /admin/payouts` | admin | Process payouts |

**Key rules**

- **Loyalty**: earn 1 point per ₹10 of eligible (post-discount) spend; 1 point = ₹1 at checkout; points cover ≤50% of a subtotal. Append-only ledger.
- **Discounts are server-authoritative**: coupon validity (dates, min-subtotal, usage/per-user limits) and points caps are re-checked at order creation; the combined discount never exceeds the subtotal and delivery is always charged.
- **Loyalty earn, points redemption, and coupon redemption are recorded in the payment transaction** — nothing is consumed by an abandoned checkout.
- **Payouts hold funds immediately** via a wallet debit on request (so the same balance can't be requested twice); a rejection refunds it. ₹500 minimum, UPI + PAN-last-4 KYC. *Real payouts need a legal/tax review before enabling.*
- **Notifications**: every event persists an in-app row; email/WhatsApp go through a transport that currently logs — the seam where SES/Twilio plug in. Delivery never breaks the originating action.
- **Referrals**: one claim per user, no self-referral; both parties earn points once, on the referee's first paid order.

## Conventions

- **Money is integer paise**, never floats (`*_paise` columns).
- **Images live in MinIO**; Postgres stores only metadata (`asset` table: bucket, object key, dimensions, checksum).
- **Order status flow**: placed → printing → framing → qc → shipped → delivered (single enum in `@ctrlp/shared`, mirrored as a Postgres enum; every change is appended to `order_status_history`).
- If better-auth plugins are added (phone OTP, admin), regenerate its tables with `npx @better-auth/cli generate` and fold them into `packages/db/src/schema/auth.ts`.
