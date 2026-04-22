# frontTest (React UI)

`frontTest` is an optional Vite + React UI to exercise `ml_agents` and proxy routes during development.

## Run

From `ml_agents/frontTest/`:

```bash
npm install
npm run dev
```

From repo root (workspace mode):

```bash
npm run dev -w fronttest
```

## Proxy behavior

Configured in `ml_agents/frontTest/vite.config.ts`:

- `/ml-agents` -> `VITE_ML_AGENTS_SERVER_URL` (defaults to `http://localhost:3000`)
- `/retriever-api` -> `VITE_RETRIEVER_PROXY_ML_URL` (defaults to `http://localhost:3001`)

Set values in `ml_agents/frontTest/.env` (see `.env.example`).

## Typical local setup

- `ml_agents` on `3000`
- `ml_intermediate_api` on `3001`
- `frontTest` Vite dev server on `5173` (unless overridden)
