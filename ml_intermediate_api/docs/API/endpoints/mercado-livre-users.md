# Mercado Livre User Endpoint

## Base path and auth

- **Base path**: `/api/mercado-livre/users/:sellerId`
- **Auth**: public endpoint (no `conditionalAuth` middleware)

## Method

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/mercado-livre/users/:sellerId` | Fetch Mercado Livre user profile by numeric user id (seller id) |

## Behavior

### GET `/api/mercado-livre/users/:sellerId`

This endpoint acts as a thin proxy over Mercado Livre's Users API:

- Calls `GET https://api.mercadolibre.com/users/<USER_ID>`
- Uses `ML_TOKEN_SECRET` as the bearer access token
- Validates a stable subset of fields with Zod, while allowing additional Mercado Livre fields to pass through

Environment variables required:

| Variable | Required | Description |
| --- | --- | --- |
| `ML_TOKEN_SECRET` | Yes | Mercado Livre access token used as `Bearer` token |

### Path params

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `sellerId` | `string` | Yes | Numeric Mercado Livre user id (often the same id you use as a seller id) |

### Success response

On success (`200`), the response is a Mercado Livre user JSON object. The server validates (at minimum) these fields exist and have expected primitive types:

- `id` (number)
- `nickname` (string)
- `registration_date` (string)
- `country_id` (string)
- `site_id` (string)
- `permalink` (string)
- `user_type` (string)

Additional fields returned by Mercado Livre are preserved.

The payload is validated using Zod schemas under `api_external/mercado_livre/users`.

### Error responses

- Bad request (`400`) - invalid seller id format

```json
{
  "error": "Bad request",
  "message": "Mercado Livre seller id is invalid"
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
  "message": "Mercado Livre user not found"
}
```

- Bad gateway (`502`)

```json
{
  "error": "Bad gateway",
  "message": "Mercado Livre user response is invalid"
}
```

Other `502` messages from this endpoint:

- `Mercado Livre request failed`

## Related endpoints

- Questions (uses `SELLER_ID` from env): `docs/API/endpoints/mercado-livre-questions.md`
- Item by id: `docs/API/endpoints/mercado-livre-items.md`

## Curl example

The dev server defaults to `PORT=3001` (see root `README.md`); change the port if yours differs.

```bash
curl -s "http://localhost:3001/api/mercado-livre/users/123456789"
```
