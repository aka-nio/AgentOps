# Mercado Livre Item Endpoint

## Base path and auth

- **Base path**: `/api/mercado-livre/items/:itemId`
- **Auth**: public endpoint (no `conditionalAuth` middleware)

## Method

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/mercado-livre/items/:itemId` | Fetch Mercado Livre item details by item id |

## Behavior

### GET `/api/mercado-livre/items/:itemId`

This endpoint acts as a thin proxy over Mercado Livre's Items API:

- Calls `GET https://api.mercadolibre.com/items/<ITEM_ID>`
- Uses `ML_TOKEN_SECRET` as the bearer access token
- Validates a stable subset of fields with Zod, while allowing additional Mercado Livre fields to pass through

Environment variables required:

| Variable | Required | Description |
| --- | --- | --- |
| `ML_TOKEN_SECRET` | Yes | Mercado Livre access token used as `Bearer` token |

### Path params

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `itemId` | `string` | Yes | Example: `MLB1234567890` |

### Success response

On success (`200`), the response is a Mercado Livre item JSON object. The server validates (at minimum) these fields exist and have expected primitive types:

- `id`, `site_id`, `title`, `category_id`
- `price`, `currency_id`
- `available_quantity`, `sold_quantity`
- `buying_mode`, `listing_type_id`, `condition`
- `permalink`, `thumbnail`, `status`

Additional fields returned by Mercado Livre are preserved.

### Error responses

- Bad request (`400`) - invalid item id format

```json
{
  "error": "Bad request",
  "message": "Mercado Livre item id is invalid"
}
```

- Configuration error (`500`)

```json
{
  "error": "Configuration error",
  "message": "Mercado Livre env is invalid"
}
```

- Unauthorized (`401`)

```json
{
  "error": "Unauthorized",
  "message": "Mercado Livre unauthorized"
}
```

- Forbidden (`403`)

```json
{
  "error": "Forbidden",
  "message": "Mercado Livre forbidden"
}
```

- Not found (`404`)

```json
{
  "error": "Not found",
  "message": "Mercado Livre item not found"
}
```

- Bad gateway (`502`)

```json
{
  "error": "Bad gateway",
  "message": "Mercado Livre item response is invalid"
}
```

Other `502` messages from this endpoint:

- `Mercado Livre request failed`

## Curl example

```bash
curl -s http://localhost:3001/api/mercado-livre/items/MLB1234567890
```
