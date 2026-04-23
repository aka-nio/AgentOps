# Process health (ml_intermediate_api)

## Base path and auth

- **Path**: `/health`
- **Auth**: public (no middleware)
- **Registration**: `src/server.ts` (root Fastify instance, not under `/api`)

## Method

| Method | Path | Description |
| --- | --- | --- |
| **GET** | `/health` | Liveness: confirms this Node process is running |

## Response

Success (**200**), JSON body:

```json
{ "ok": true }
```

This does **not** verify PostgreSQL, Mercado Libre, or the ml_agents upstream. For **ml_agents** reachability when using the proxy, use **`GET /graph-health`** (see [ML Agents upstream proxy](./ml-agents-upstream-proxy.md)).

## See also

- [API index](../README.md)
