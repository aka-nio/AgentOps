# ml_intermediate_api

Basic CRUD API scaffold using Fastify + Zod + Prisma (PostgreSQL) with layered architecture:

`route -> controller -> service -> db_operations model -> Prisma`

## Quick start

```bash
npm install
npm run docker:up:postgres
npx prisma generate
npx prisma migrate dev
npm run start
```

## Available scripts

- `npm run start`: dev server with nodemon + tsx
- `npm run build`: compile TypeScript into `dist/`
- `npm run start:prod`: run compiled app
- `npm run type-check`: TypeScript checks without emit
- `npm run docker:up:postgres`: start local PostgreSQL
- `npm run docker:up`: build and start API + PostgreSQL containers
- `npm run docker:test:smoke`: run Docker CRUD smoke verification
- `npm run docker:down`: stop local containers
- `npm run dev-token`: print development JWT token
- `npm run ml-api-introspect`: crawl Mercado Libre API metadata via `OPTIONS` and write `docs/mercado_livre/api_introspection.json` (configurable via env vars in `src/scripts/ml-api-introspect.ts`)

## Documentation

- **Index (all routes):** `docs/API/README.md` — includes `/health`, ML Agents **proxy** (`/agent-questions/run`, `/agent-deals/run`, `/invoke`, `/graph-health`), and `/api/...` Mercado Livre + external auth
- `docs/API/endpoints/server-health.md` — `GET /health`
- `docs/API/endpoints/ml-agents-upstream-proxy.md` — proxy to ml_agents (`ML_AGENTS_SERVER_URL`)
- `docs/API/endpoints/external-auth.md` — `POST /api/external-auth/token`
- `docs/API/endpoints/mercado-livre-questions.md` — `GET /api/mercado-livre/questions`
- `docs/API/endpoints/mercado-livre-items.md` — `GET /api/mercado-livre/items/:itemId`
- `docs/API/endpoints/mercado-livre-users.md` — `GET /api/mercado-livre/users/:sellerId` (numeric user / seller id; `ML_TOKEN_SECRET`)
- `docs/API/endpoints/mercado-livre-seller-promotions.md` — seller promotions (list, detail, items, per-item, candidates)

For tables of paths and quick links, use **`docs/API/README.md`**.

## Prisma version and constraints

- **Prisma ORM version**: `6.19.x` (see `package.json`).
- **Reason**: we stay on Prisma 6 for **MongoDB compatibility**; Prisma 7+ changes the datasource configuration model and MongoDB support story.
- **Datasource configuration**:
  - We intentionally keep the `url` inside `schema.prisma`:
    ```prisma
    datasource db {
      provider = "postgresql"
      url      = env("DATABASE_URL")
    }
    ```
  - This is the **expected** configuration for Prisma 6.  
  - Some IDE plugins or recent Prisma VS Code extensions may show a warning like  
    _"The datasource property `url` is no longer supported in schema files..."_.  
    That message is for **Prisma 7+** and can be ignored in this project.
- **Important**: do **not** upgrade `@prisma/client` / `prisma` to 7+ or move the datasource URL to `prisma.config.ts` without first:
  - validating MongoDB compatibility for our stack, and
  - updating `schema.prisma`, `prismaInstance.ts` and our tooling accordingly.
