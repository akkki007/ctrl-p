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

## Conventions

- **Money is integer paise**, never floats (`*_paise` columns).
- **Images live in MinIO**; Postgres stores only metadata (`asset` table: bucket, object key, dimensions, checksum).
- **Order status flow**: placed → printing → framing → qc → shipped → delivered (single enum in `@ctrlp/shared`, mirrored as a Postgres enum; every change is appended to `order_status_history`).
- If better-auth plugins are added (phone OTP, admin), regenerate its tables with `npx @better-auth/cli generate` and fold them into `packages/db/src/schema/auth.ts`.
