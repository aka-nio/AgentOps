## Agent deals

Resolves **Mercado Livre seller promotion** questions using the intermediate API (`RETRIEVER_PROXY_ML_URL`).

**Navigation:** [Documentation index](../README.md)

## Modes

1. **Tool-calling agent (graph / `userMessage`)** — When `OPENAI_API_KEY` is set and `userMessage` is non-empty (the graph passes the user’s natural-language request), the agent chooses among the proxy tools:
   - list invitations (`GET .../seller-promotions`)
   - promotion detail (`GET .../seller-promotions/:promotionId`)
   - items in a campaign (`GET .../seller-promotions/:promotionId/items`)
   - per-listing promotion state (`GET .../seller-promotions/items/:itemId`)
   - promotion candidate (`GET .../seller-promotions/candidates/:candidateId`)

2. **Legacy list-only** — If `OPENAI_API_KEY` is missing or `userMessage` is empty, only the **list** endpoint is called (optional `promotionType` filter).

## Output

Persists a JSON artifact to `src/agent_deals/outputs/seller-promotions.json` (unless dry-run). The file includes `tool_trace` and `final_assistant_text` when the LLM path ran.

## CLI

```bash
npm run agent:deals
AGENT_DEALS_PROMOTION_TYPE=DEAL npm run agent:deals
npm run agent:deals:dry
```

CLI does not set `userMessage`; use the **HTTP** or **orchestrator** path for the full tool-calling agent.

## HTTP (ml_agents)

`POST /agent-deals/run` with body:

- `dryRun` (optional)
- `promotionType` (optional; list filter or LLM hint)
- `userMessage` (optional; when set with `OPENAI_API_KEY`, enables tool-calling over all promotion endpoints)

Upstream reference: [Manage promotions](https://developers.mercadolibre.com.ar/en_us/ship-products/manage-promotion) (Mercado Libre).
