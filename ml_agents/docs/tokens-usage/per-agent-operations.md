# Per-agent operations — tokens, time, estimated cost

Use this page to track **rolling averages** (or medians) for each **agent** and each **operation** (step or tool). Numbers below are **templates** — replace with values from your environment and `logs/agents-*.jsonl`.

**Models (defaults in code, verify in repo):**

- Orquestrador / structured plan: `gpt-4o-mini` (`src/graph/agent-graph.ts`).
- `agent_deals` LLM rounds: `gpt-4o-mini` (`src/agent_deals/deals-llm.ts`).

**How to aggregate (example with `jq`):**

```bash
# All LLM steps for agent_deals on a given day (UTC date in filename)
grep '"agent":"agent_deals"' logs/agents-2026-04-22.jsonl | jq 'select(.kind=="step" and .step|tostring|startswith("deals_llm"))'
```

---

## `graph_invoke` (orchestrator run)

| Operation / step | Typical `step` name | Notes | Avg duration (ms) | Avg prompt tok | Avg completion tok | Est. USD / run* |
|------------------|---------------------|-------|-------------------|----------------|--------------------|-----------------|
| Full graph | `graph_langgraph` | Wall time for `agentGraph.invoke` | *TBD* | — | — | — |
| Planner LLM | `graph_llm_usage` | When not using heuristics only | *TBD* | *TBD* | *TBD* | *TBD* |
| Node: retriever | `graph_node_agent_retriever` | | *TBD* | — | — | — |
| Node: questions | `graph_node_agent_questions` | Many internal LLM calls | *TBD* | *TBD* | *TBD* | *TBD* |
| Node: deals | `graph_node_agent_deals` | Wraps full `agent_deals` run | *TBD* | — | — | — |
| Node: vector | `graph_node_vector_search` | Usually no LLM | *TBD* | — | — | — |

\*USD: compute from token columns using current `gpt-4o-mini` *input* / *output* price per token.

---

## `agent_deals`

| Operation / step | `step` / `tool` name | Notes | Avg duration (ms) | Avg prompt tok | Avg completion tok | Est. USD / op* |
|------------------|----------------------|-------|-------------------|----------------|--------------------|----------------|
| LLM round *n* | `deals_llm_round_0`, `deals_llm_round_1`, … | One per model turn; tokens on `step` line | *TBD* | *TBD* | *TBD* | *TBD* |
| List invitations | `fetch_ml_seller_promotions` | `kind: tool` | *TBD* | — | — | — |
| Promotions by SKU | `find_promotions_for_seller_sku` | Many HTTP calls; duration often dominates | *TBD* | — | — | — |
| Other ML tools | `fetch_ml_seller_promotion_*`, etc. | | *TBD* | — | — | — |
| Write JSON output | `write_seller_promotions_payload` | Local disk | *TBD* | — | — | — |
| **Run total** | `run_end` | `llm_tokens_cumulative` + `durationMs` | *TBD* | *TBD* | *TBD* | *TBD* |

Programmatic totals are also returned on the **result object** as `run_metrics` (`duration_ms`, `llm_tokens`) for `runAgentDealsWithResult` when the run uses `withAgentRunLog`.

---

## `agent_questions`

| Operation | Typical `step` name | Avg duration (ms) | Avg tokens / question* |
|-----------|---------------------|-------------------|-------------------------|
| Item-context decision | `openai_item_context_decision` | *TBD* | *TBD* |
| Draft answer | `openai_draft_answer` (or equivalent in your log) | *TBD* | *TBD* |

\*Per-question rows vary with batching; prefer **p50/p95** after many runs.

---

## `agent_retriever`

Most work is **HTTP tools** (`fetch_ml_questions`, `fetch_ml_item`); use `kind: tool` and `durationMs` for averages, not LLM cost.
