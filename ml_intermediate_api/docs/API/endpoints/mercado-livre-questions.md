# Mercado Livre Questions Endpoint

## Base path and auth

- **Base path**: `/api/mercado-livre/questions`
- **Auth**: public endpoint (no `conditionalAuth` middleware)

## Method

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/mercado-livre/questions` | List questions received by the configured Mercado Livre seller |

## Behavior

### GET `/api/mercado-livre/questions`

This endpoint acts as a thin proxy over Mercado Livre's Questions API:

- Calls `GET https://api.mercadolibre.com/questions/search?seller_id=<SELLER_ID>&api_version=4`
- Uses `ML_TOKEN_SECRET` as the bearer access token
- Returns the validated JSON response directly

Environment variables required:

| Variable | Required | Description |
| --- | --- | --- |
| `ML_TOKEN_SECRET` | Yes | Mercado Livre access token used as `Bearer` token |
| `SELLER_ID` | Yes | Seller id whose questions will be listed |

### Success response

On success (`200`), the response mirrors Mercado Livre's structure (simplified):

```json
{
  "total": 1,
  "limit": 50,
  "questions": [
    {
      "id": 123,
      "item_id": "MLA123",
      "seller_id": 999,
      "status": "UNANSWERED",
      "text": "Test question",
      "date_created": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

The payload is validated using Zod schemas under `api_external/mercado_livre/questions`.

### Error responses

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

- Bad gateway (`502`)

```json
{
  "error": "Bad gateway",
  "message": "Mercado Livre request failed"
}
```

## Related endpoints

- User profile by numeric seller / user id: `docs/API/endpoints/mercado-livre-users.md`
- Item by id: `docs/API/endpoints/mercado-livre-items.md`

## Curl example

The dev server defaults to `PORT=3001` (see root `README.md`); change the port if yours differs.

```bash
curl -s "http://localhost:3001/api/mercado-livre/questions"
```

