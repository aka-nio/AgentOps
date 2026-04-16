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

## Documentation

- API docs index: `docs/API/README.md`
- External auth endpoint: `docs/API/endpoints/external-auth.md`
- Mercado Livre questions endpoint: `docs/API/endpoints/mercado-livre-questions.md`
 - Docker smoke testing: `docs/API/testing/docker-smoke.md`

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
