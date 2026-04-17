# API Docs Index

Central index for API endpoint and verification documentation.

## Endpoints

- External auth token: `docs/API/endpoints/external-auth.md`
- Mercado Livre questions: `docs/API/endpoints/mercado-livre-questions.md`
- Mercado Livre item: `docs/API/endpoints/mercado-livre-items.md`
- Mercado Livre user: `docs/API/endpoints/mercado-livre-users.md`

**Mercado Livre public routes** (thin proxies; details in each file above):

- `GET /api/mercado-livre/questions`
- `GET /api/mercado-livre/items/:itemId`
- `GET /api/mercado-livre/users/:sellerId` — numeric Mercado Livre user id (same id commonly used as seller id)

## How to keep this updated

When adding a new endpoint or test document:

1. Add the new file under `docs/API/endpoints/` or `docs/API/testing/`
2. Add a matching entry in this index
3. Ensure root `README.md` points to this index
