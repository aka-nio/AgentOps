# External Auth Endpoint

## Base path and auth

- **Base path**: `/api/external-auth/token`
- **Auth**: public endpoint (no `conditionalAuth` middleware)

## Method

| Method | Path | Description |
| --- | --- | --- |
| POST | `/api/external-auth/token` | Authenticate against external auth API and return normalized token |

## Request details

### POST `/api/external-auth/token`

Body:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `user` | `string` | Yes | External auth username/login |
| `pass` | `string` | Yes | External auth password/secret |

Environment variable required:

| Variable | Required | Description |
| --- | --- | --- |
| `EXTERNAL_AUTH_URL` | Yes | Full URL for upstream external auth API |

## Response behavior

The service accepts both upstream formats and normalizes output to:

```json
{
  "token": "..."
}
```

Supported upstream payloads:

- `{ "token": "..." }`
- `{ "access_token": "..." }`

## Error responses

- Validation error (`400`)

```json
{
  "error": "Validation error",
  "details": [
    {
      "code": "too_small",
      "message": "User is required",
      "path": ["user"]
    }
  ]
}
```

- Unauthorized (`401`)

```json
{
  "error": "Unauthorized",
  "message": "External authentication failed"
}
```

- Configuration error (`500`)

```json
{
  "error": "Configuration error",
  "message": "External auth URL is missing"
}
```

- Bad gateway (`502`)

```json
{
  "error": "Bad gateway",
  "message": "External auth unavailable"
}
```

Other `502` messages from this endpoint:

- `External auth request failed`
- `Invalid external auth response`

## Curl example

```bash
curl -s -X POST http://localhost:3000/api/external-auth/token \
  -H "Content-Type: application/json" \
  -d '{"user":"external-user","pass":"external-pass"}'
```
