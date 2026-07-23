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

## Conventions

- **Money is integer paise**, never floats (`*_paise` columns).
- **Images live in MinIO**; Postgres stores only metadata (`asset` table: bucket, object key, dimensions, checksum).
- **Order status flow**: placed → printing → framing → qc → shipped → delivered (single enum in `@ctrlp/shared`, mirrored as a Postgres enum; every change is appended to `order_status_history`).
- If better-auth plugins are added (phone OTP, admin), regenerate its tables with `npx @better-auth/cli generate` and fold them into `packages/db/src/schema/auth.ts`.
