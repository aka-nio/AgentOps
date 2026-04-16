# Mercado Livre API catch-all proxy

## Base path and auth

- **Base path**: `/api/ml-proxy/...`
- **Auth**: public entrypoint on this API, but upstream calls are authenticated using **`ML_TOKEN_SECRET` from the server environment** (clients should not send Mercado Libre bearer tokens to this API).

## What it does

This endpoint is a **reverse proxy** to Mercado Libre’s REST API (`https://api.mercadolibre.com` by default).

It supports common HTTP verbs used by Mercado Libre integrations:

- `GET`, `HEAD`, `OPTIONS`
- `POST`, `PUT`, `PATCH`, `DELETE`

The proxy:

- Forwards the **same path** after `/api/ml-proxy` to the upstream host
- Preserves **query strings**
- Preserves **raw request bodies** (JSON, urlencoded, etc.)
- Injects upstream authorization: `Authorization: Bearer <ML_TOKEN_SECRET>`
- **Does not** forward the client `Authorization` header to Mercado Libre

## Allowlist (important)

Paths are **not open**. The proxy only allows paths implied by:

- [`docs/mercado_livre/api_introspection.json`](../../mercado_livre/api_introspection.json)

At startup, the server loads that JSON and builds a **prefix allowlist** from:

- `endpoints[].path`
- `endpoints[].body.methods[].example` (when present)
- `endpoints[].body.connections` values (when present)
- `endpoints[].body.related_resources` (best-effort recursive scan for strings that look like `/...` paths)

A request path `P` is allowed if:

- `P === allowedPrefix`, or
- `P.startsWith(allowedPrefix + "/")`

Everything else returns **404** with:

```json
{
  "error": "Not found",
  "message": "Path is not allowlisted"
}
```

### Regenerating the allowlist source

Run:

```bash
npm run ml-api-introspect
```

Optional env vars for the generator are documented in [`src/scripts/ml-api-introspect.ts`](../../../src/scripts/ml-api-introspect.ts).

### Overriding the introspection JSON path

By default the proxy reads:

- `docs/mercado_livre/api_introspection.json`

Override with:

- `ML_API_INTROSPECTION_JSON_PATH=/absolute/or/relative/path.json`

## Upstream base URL

Default upstream is `https://api.mercadolibre.com`.

Override with:

- `ML_API_BASE_URL=https://api.mercadolibre.com`

## Examples

### GET (proxies to upstream GET)

```bash
curl -s "http://localhost:3001/api/ml-proxy/countries/BR"
```

### POST (proxies to upstream POST)

```bash
curl -s -X POST "http://localhost:3001/api/ml-proxy/some/allowlisted/path" \
  -H "Content-Type: application/json" \
  -d '{"hello":"world"}'
```

## Operational notes

- `api_introspection.json` is produced via `OPTIONS` introspection and may include rows where `OPTIONS` failed (for example edge policy blocks). Those paths can still be allowlisted as **roots**, while direct `GET` calls may work.
- This proxy intentionally trades “maximum coverage” for safety: it mirrors what your introspection artifact discovered, not the entire Mercado Libre surface area.
