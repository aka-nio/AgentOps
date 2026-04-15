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

- Candidate endpoint: `docs/API/endpoints/candidate.md`
- Docker smoke testing: `docs/API/testing/docker-smoke.md`
