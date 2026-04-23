# Flow: orchestrator → `agent_deals` → promotions by SKU

Example user message:

> *Liste todas as promoções para o sku 22992*

This is a **single** `graph_invoke` run that usually does **not** call the planner LLM if heuristics route to `agent_deals` (see `inferRouteFromHeuristics` in `src/graph/orchestration-schema.ts`). When the OpenAI key is set, the orchestrator may still call the model in other planner cycles; each call appears as `graph_llm_usage` on the **`graph_invoke`** `runId`.

## High-level sequence

| # | Who | What happens | Time / tokens (illustrative) |
|---|-----|--------------|------------------------------|
| 1 | `graph_invoke` | `run_start`, LangGraph runs | — |
| 2 | `orquestrador` | Heuristic → `route: agent_deals` (or LLM plan) | 0 LLM calls if heuristic; else see `graph_llm_usage` |
| 3 | `graph_node_agent_deals` | One `step` wrapping the whole deals node | Wall time for nested `agent_deals` |
| 4 | **`agent_deals`** (nested run) | `run_start` with `agent: "agent_deals"` | Own `runId` in JSONL |
| 5 | `agent_deals_llm` | Optional outer step in `agent.ts` | — |
| 6 | `deals_llm_round_0` | Model chooses tool(s), e.g. `find_promotions_for_seller_sku` | **Tokens** on this `step` line |
| 7 | `find_promotions_for_seller_sku` | `kind: tool`; many proxy GETs | **Duration** often large (HTTP) |
| 8 | `deals_llm_round_1` | Model summarizes for the user | **Tokens** on this `step` line |
| 9 | `write_seller_promotions_payload` | Writes `outputs/seller-promotions.json` | Short |
| 10 | `agent_deals` | `run_end` with `llm_tokens_cumulative` + `durationMs` | Rollup for nested run |
| 11 | `graph_langgraph` | Full graph duration, `llm_end_events` count | Top-level telemetry |
| 12 | `graph_invoke` | `run_end` | **CLI `llm_tokens`** matches graph-level LLM usage |

Replace the “illustrative” column with numbers from your JSONL (filter by `runId` for the same user request).

## How to read one real run

1. Note **`runId`** printed by `npm run orchestrator -- "..."`.
2. In `logs/agents-*.jsonl`, grep that `runId` for **`graph_invoke`** — you get planner + graph usage.
3. Grep **`"agent":"agent_deals"`** and the **same wall-clock window** (or match `run_start` metadata) to get **`deals_llm_round_*`** and **`find_promotions_for_seller_sku`** tool lines.

## Cost outlook

- **LLM cost** is driven by **orchestrator** (if used) + **`deals_llm_round_*`** (usually 2 rounds: tool selection + final answer). Use [per-agent-operations](per-agent-operations.md) formulas.
- **Latency** is often dominated by **`find_promotions_for_seller_sku`** (listing promotions, paginating items, N × `GET /items/{id}`), not by tokens.

## Suggested row to paste after a measured run

| Field | Value |
|-------|--------|
| Date (UTC) | *YYYY-MM-DD* |
| `graph_invoke` runId | *uuid* |
| `agent_deals` runId | *uuid* |
| Total wall time (graph) | *ms* |
| Total LLM tokens (graph rollup) | prompt=* / completion=* / total=* |
| `agent_deals` duration | *ms* |
| `find_promotions_for_seller_sku` tool duration | *ms* |
| Est. USD (sum both models) | *use pricing page* |
