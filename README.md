# Fasal Slot

Slot booking and queue visibility platform for MSP crop procurement. See `Docs/` for the PRD and implementation plan.

## Architecture

Single Next.js 14 (App Router) app: pages + API routes (`src/app/api/**/route.ts`) in one
deployment. Built for a small pilot scale — no separate backend service, no Redis. OTP
codes and refresh tokens live in Postgres.

- `apps/web` — Next.js 14 (TypeScript, Tailwind) frontend + API route handlers
- `packages/types` — shared TypeScript types

**Deployment target:** Vercel (frontend + API routes) + Supabase (Postgres). Both run
on their free tiers at pilot scale.

## Local development

```bash
npm install
docker compose up -d                 # local Postgres
cp apps/web/.env.local.example apps/web/.env.local
npm run build -w packages/types
npm run migrate -w apps/web
npm run seed -w apps/web             # optional: seeds 3 centres, 14 days of capacity,
                                      # a demo agent, and a demo govt operator
npm run dev                          # http://localhost:3000
```

`GET /api/health` checks Postgres connectivity.

## Deploying

1. Create a Supabase project, copy the pooled connection string (Project Settings ->
   Database -> Connection pooling) into `DATABASE_URL`.
2. In Vercel, create a project from this repo, set **Root Directory** to `apps/web`
   (Vercel still runs `npm install` from the repo root for the workspaces), and set
   `DATABASE_URL` and `JWT_ACCESS_SECRET` as environment variables.
3. Run `npm run migrate -w apps/web` once locally against the Supabase `DATABASE_URL` to
   apply the schema (or wire it into a deploy hook later).
