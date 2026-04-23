# API Docs Index

Central index for API endpoint and verification documentation.

## Server (no `/api` prefix)

| Method | Path | Document |
| --- | --- | --- |
| **GET** | `/health` | [Process health](./endpoints/server-health.md) |
| **POST** | `/agent-questions/run` | [ML Agents upstream proxy](./endpoints/ml-agents-upstream-proxy.md) (→ ml_agents) |
| **POST** | `/agent-deals/run` | [ML Agents upstream proxy](./endpoints/ml-agents-upstream-proxy.md) |
| **POST** | `/invoke` | [ML Agents upstream proxy](./endpoints/ml-agents-upstream-proxy.md) |
| **GET** | `/graph-health` | [ML Agents upstream proxy](./endpoints/ml-agents-upstream-proxy.md) (forwards to ml_agents `GET /health`) |

Requires **`ML_AGENTS_SERVER_URL`** for the four proxy rows above; see that doc for **503** when unset.

**frontTest (Vite):** the browser often uses `/ml-agents/...` which is rewritten to the paths above. Details in the proxy doc.

## Endpoints under `/api`

| Method | Path | Document |
| --- | --- | --- |
| **POST** | `/api/external-auth/token` | [External auth](./endpoints/external-auth.md) |
| **GET** | `/api/mercado-livre/questions` | [Mercado Livre questions](./endpoints/mercado-livre-questions.md) |
| **GET** | `/api/mercado-livre/items/:itemId` | [Mercado Livre item](./endpoints/mercado-livre-items.md) |
| **GET** | `/api/mercado-livre/users/:sellerId` | [Mercado Livre user](./endpoints/mercado-livre-users.md) — numeric ML user / seller id |
| **GET** | `/api/mercado-livre/seller-promotions` | [Seller promotions](./endpoints/mercado-livre-seller-promotions.md) (list) |
| **GET** | `/api/mercado-livre/seller-promotions/:promotionId` | [Seller promotions](./endpoints/mercado-livre-seller-promotions.md) (detail) |
| **GET** | `/api/mercado-livre/seller-promotions/:promotionId/items` | [Seller promotions](./endpoints/mercado-livre-seller-promotions.md) (items) |
| **GET** | `/api/mercado-livre/seller-promotions/items/:itemId` | [Seller promotions](./endpoints/mercado-livre-seller-promotions.md) (per item) |
| **GET** | `/api/mercado-livre/seller-promotions/candidates/:candidateId` | [Seller promotions](./endpoints/mercado-livre-seller-promotions.md) (candidate) |

**Mercado Livre** routes are thin proxies; env vars and errors are described in each file (typically `ML_TOKEN_SECRET`, etc.).

## How to keep this updated

1. Add or change implementation in `src/server.ts` (root routes), `src/api/ml_agents_proxy/`, or `src/api/routes/mainPublic.routes.ts` (+ feature routes).
2. Add or update the matching file under `docs/API/endpoints/`.
3. Add a row to the tables above.
4. Ensure the root [README.md](../../README.md) “Documentation” section lists new entry points.
5. For Mercado Livre, optional cross-links to [Manage promotions](https://developers.mercadolibre.com.ar/en_us/ship-products/manage-promotion) and related ML docs when relevant.
