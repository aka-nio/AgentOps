# ML Agents upstream proxy

## Purpose

This service can **forward a subset of HTTP calls** to the **ml_agents** Node app (`ml_agents/src/server.ts`) so clients (e.g. **frontTest**) can call a **single base URL** (this API) instead of two ports. Registration is in `src/api/ml_agents_proxy/mlAgentsUpstream.proxy.ts` (no `/api` prefix; mounted at the Fastify **root**).

## Environment

| Variable | Required | Description |
| --- | --- | --- |
| `ML_AGENTS_SERVER_URL` | Yes for proxying | Base URL of ml_agents, e.g. `http://127.0.0.1:3000` (no trailing slash). If unset, proxied routes return **503** with a clear message. |

## Error when upstream is not configured

If `ML_AGENTS_SERVER_URL` is missing or empty, these routes respond:

- **503** `Service unavailable` with `message` explaining to set the env var and point at the ml_agents server.

## Routes (on ml_intermediate_api)

Paths below are the **real paths** on this server (default port from `PORT`, usually **3001**). Vite’s **frontTest** often calls **`/ml-agents/...`**, with `vite.config.ts` rewriting to strip `/ml-agents` before forwarding to this API—see the **Browser / frontTest** column.

| Method | Path (this API) | Proxied to ml_agents | Body | Browser / frontTest (Vite) |
| --- | --- | --- | --- | --- |
| **POST** | `/agent-questions/run` | `POST {ML_AGENTS_SERVER_URL}/agent-questions/run` | JSON: same as ml_agents (e.g. `limit`, `dryRun`, `payload`, `persist`) | `/ml-agents/agent-questions/run` |
| **POST** | `/agent-deals/run` | `POST .../agent-deals/run` | JSON: e.g. `dryRun`, `promotionType` | `/ml-agents/agent-deals/run` |
| **POST** | `/invoke` | `POST .../invoke` | JSON: LangGraph / orchestrator input (see ml_agents) | `/ml-agents/invoke` |
| **GET** | `/graph-health` | `GET .../health` | — | `/ml-agents/graph-health` |

- **Status codes** and **response bodies** are passed through from ml_agents (JSON parsed when `Content-Type` is JSON).
- **`GET /health` on this API** (see `server.ts`) is **not** the same as `/graph-health`: the latter checks reachability of **ml_agents** via the proxy; the global `/health` only reports this process.

## Not proxied (call ml_agents directly or extend the plugin)

The ml_agents server also exposes (among others) `POST /orchestrator/run` and `POST /vectors/search`. Those are **not** registered on this proxy today. To add them, extend `mlAgentsUpstream.proxy.ts` and document new rows here.

## See also

- [API index](../README.md)
- ml_agents `src/server.ts` for authoritative route list and request shapes
