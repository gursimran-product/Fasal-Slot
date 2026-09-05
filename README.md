# Fasal Slot

Slot booking and queue visibility platform for MSP crop procurement. See `Docs/` for the PRD and implementation plan.

## Structure

- `apps/web` — Next.js 14 (App Router, TypeScript, Tailwind) frontend
- `apps/api` — Express + TypeScript backend
- `packages/types` — shared TypeScript types

## Local development

```bash
npm install
docker compose up -d          # Postgres + Redis
cp apps/api/.env.example apps/api/.env
npm run build -w packages/types
npm run migrate -w apps/api
npm run seed -w apps/api       # optional: seeds 3 centres, 14 days of capacity
npm run dev:api                # http://localhost:4000
npm run dev:web                # http://localhost:3000
```

`GET /health` on the API checks Postgres and Redis connectivity.
