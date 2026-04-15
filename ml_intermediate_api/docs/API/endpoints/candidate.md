# Candidate Endpoint

## Base path and auth

- **Base path**: `/api/candidate`
- **Auth**: protected by `conditionalAuth` middleware.  
  If `AUTH_STATUS=on`, send `Authorization: Bearer <JWT>`.

## Methods

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/candidate` | List candidates |
| GET | `/api/candidate?id=<uuid>` | Get one candidate by id |
| POST | `/api/candidate` | Create candidate |
| PUT | `/api/candidate/:id` | Update candidate |
| DELETE | `/api/candidate/:id` | Delete candidate |

## Request details

### GET `/api/candidate`

Query params:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | `string (uuid)` | No | If present, returns one candidate |
| `search` | `string` | No | Filters by name/email (`contains`) |
| `limit` | `number` | No | Default `20`, max `100` |
| `offset` | `number` | No | Default `0` |

### POST `/api/candidate`

Body:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `name` | `string` | Yes | Min 2, max 100 |
| `email` | `string` | Yes | Must be valid email |

### PUT `/api/candidate/:id`

Path params:

| Field | Type | Required |
| --- | --- | --- |
| `id` | `string (uuid)` | Yes |

Body:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `name` | `string` | No | Min 2, max 100 |
| `email` | `string` | No | Must be valid email |

At least one field must be provided.

### DELETE `/api/candidate/:id`

Path params:

| Field | Type | Required |
| --- | --- | --- |
| `id` | `string (uuid)` | Yes |

## Success and error responses

### Success examples

- `GET /api/candidate` -> `200`

```json
{
  "data": [
    {
      "id": "4d5ed079-f8dc-40bf-8cc2-9cf91ee1f20f",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "createdAt": "2026-04-15T13:15:42.236Z",
      "updatedAt": "2026-04-15T13:15:42.236Z"
    }
  ],
  "total": 1,
  "limit": 20,
  "offset": 0
}
```

- `POST /api/candidate` -> `201`

```json
{
  "id": "4d5ed079-f8dc-40bf-8cc2-9cf91ee1f20f",
  "name": "Jane Doe",
  "email": "jane@example.com",
  "createdAt": "2026-04-15T13:15:42.236Z",
  "updatedAt": "2026-04-15T13:15:42.236Z"
}
```

### Error examples

- Validation error (`400`)

```json
{
  "error": "Validation error",
  "details": [
    {
      "code": "invalid_string",
      "message": "Invalid email",
      "path": ["email"],
      "validation": "email"
    }
  ]
}
```

- Not found (`404`)

```json
{
  "error": "Not found",
  "message": "Candidate not found"
}
```

- Conflict (`409`)

```json
{
  "error": "Conflict",
  "message": "Candidate already exists"
}
```

## Curl examples

```bash
# List
curl -s http://localhost:3000/api/candidate

# Create
curl -s -X POST http://localhost:3000/api/candidate \
  -H "Content-Type: application/json" \
  -d '{"name":"Jane Doe","email":"jane@example.com"}'

# Get one
curl -s "http://localhost:3000/api/candidate?id=4d5ed079-f8dc-40bf-8cc2-9cf91ee1f20f"

# Update
curl -s -X PUT http://localhost:3000/api/candidate/4d5ed079-f8dc-40bf-8cc2-9cf91ee1f20f \
  -H "Content-Type: application/json" \
  -d '{"name":"Jane D."}'

# Delete
curl -s -X DELETE http://localhost:3000/api/candidate/4d5ed079-f8dc-40bf-8cc2-9cf91ee1f20f
```

## Docker verification workflow

Use the project scripts to run and verify this endpoint stack in Docker:

```bash
# Build and start API + PostgreSQL
npm run docker:up

# Run end-to-end CRUD smoke test for /api/candidate
npm run docker:test:smoke

# Stop containers
npm run docker:down
```

The smoke script validates:

- health check
- list candidates
- create candidate
- get candidate by id
- update candidate
- delete candidate
- final list consistency

For detailed smoke-test documentation, see `docs/API/testing/docker-smoke.md`.
