# Docker Smoke Test

This project includes an automated Docker smoke test for CRUD verification.

## Purpose

The script validates the API runtime and candidate CRUD flow in a running Docker stack.

Script location: `src/scripts/docker-crud-smoke.ts`

NPM command: `npm run docker:test:smoke`

## Prerequisites

- Docker daemon running
- Dependencies installed (`npm install`)

## Run flow

```bash
# 1) Build and start containers
npm run docker:up

# 2) Execute smoke test against the Dockerized API
npm run docker:test:smoke

# 3) Stop and clean up containers
npm run docker:down
```

## What is validated

1. `GET /health` returns `{ "ok": true }`
2. Initial `GET /api/candidate` list works
3. `POST /api/candidate` creates a record
4. `GET /api/candidate?id=<id>` returns created record
5. `PUT /api/candidate/:id` updates record
6. `DELETE /api/candidate/:id` removes record
7. Final `GET /api/candidate` no longer includes deleted record

## Optional configuration

Override API base URL with:

```bash
SMOKE_BASE_URL=http://localhost:3000 npm run docker:test:smoke
```
