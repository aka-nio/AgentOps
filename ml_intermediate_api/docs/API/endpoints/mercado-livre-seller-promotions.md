# Mercado Livre seller promotions (invitations and related reads)

## Base path and auth

- **Base path**: `/api/mercado-livre/seller-promotions`
- **Auth**: public endpoint (no `conditionalAuth` middleware)

## Environment variables (all routes)

| Variable | Required | Description |
| --- | --- | --- |
| `ML_TOKEN_SECRET` | Yes | Mercado Livre access token (Bearer) |
| `SELLER_ID` | Yes | Used only for **list** (`GET` base path) |

## Methods

| Method | Path | Upstream (Mercado Libre) |
| --- | --- | --- |
| GET | `/api/mercado-livre/seller-promotions` | `GET /seller-promotions/users/{SELLER_ID}?app_version=v2` |
| GET | `/api/mercado-livre/seller-promotions/:promotionId` | `GET /seller-promotions/promotions/{id}?promotion_type=...&app_version=v2` |
| GET | `/api/mercado-livre/seller-promotions/:promotionId/items` | `GET /seller-promotions/promotions/{id}/items?promotion_type=...&...` |
| GET | `/api/mercado-livre/seller-promotions/items/:itemId` | `GET /seller-promotions/items/{itemId}?app_version=v2` |
| GET | `/api/mercado-livre/seller-promotions/candidates/:candidateId` | `GET /seller-promotions/candidates/{id}?app_version=v2` |

**Route order** on the gateway registers `/items/...` and `/candidates/...` before `/:promotionId` so they are not captured as a promotion id.

### GET `/api/mercado-livre/seller-promotions`

Lists promotion invitations for the configured seller.

| Query | Required | Description |
| --- | --- | --- |
| `promotion_type` | No | Filters `results` to rows where `type` matches (e.g. `DEAL`). |

### GET `/api/mercado-livre/seller-promotions/:promotionId`

Single promotion / campaign details.

| Query | Required | Description |
| --- | --- | --- |
| `promotion_type` | Yes | ML campaign type, e.g. `DEAL`, `MARKETPLACE_CAMPAIGN`, `VOLUME`. |

### GET `/api/mercado-livre/seller-promotions/:promotionId/items`

Items participating or eligible in the promotion (paginate/filter per ML docs).

| Query | Required | Description |
| --- | --- | --- |
| `promotion_type` | Yes | Same as on ML, e.g. `DEAL`. |
| `status` | No | Passthrough. |
| `status_item` | No | e.g. `active` or `paused` where supported. |
| `item_id` | No | Passthrough. |
| `limit` | No | Passthrough. |
| `offset` | No | Passthrough. |
| `search_after` | No | Cursor pagination when returned by ML. |

### GET `/api/mercado-livre/seller-promotions/items/:itemId`

Promotion state for a specific listing `itemId`.

No required query parameters.

### GET `/api/mercado-livre/seller-promotions/candidates/:candidateId`

Resolves a candidate resource (e.g. after a notification). No required query.

## Error mapping

Same as other Mercado Livre proxies: configuration / 401 / 403 / generic upstream → `500` / `401` / `403` / `502`.

Reference: [Manage promotions](https://developers.mercadolibre.com.ar/en_us/ship-products/manage-promotion) (Mercado Libre Developers).
