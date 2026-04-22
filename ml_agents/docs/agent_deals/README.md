## Agent deals

Lists **promotion invitations** for the configured Mercado Livre seller (all types: DEAL, MARKETPLACE_CAMPAIGN, VOLUME, etc.) via the intermediate API.

**Navigation:** [Documentation index](../README.md)

## Flow

- Calls `GET /api/mercado-livre/seller-promotions` on `RETRIEVER_PROXY_ML_URL` (optional query `promotion_type` to filter by `type`).
- Persists the JSON response to `src/agent_deals/outputs/seller-promotions.json` (unless dry-run).

## CLI

```bash
npm run agent:deals
AGENT_DEALS_PROMOTION_TYPE=DEAL npm run agent:deals
npm run agent:deals:dry
```

## HTTP (ml_agents)

`POST /agent-deals/run` with body `{ "dryRun"?: boolean, "promotionType"?: string }`.

Upstream reference: [Manage promotions](https://developers.mercadolibre.com.ar/en_us/ship-products/manage-promotion) (Mercado Libre).
