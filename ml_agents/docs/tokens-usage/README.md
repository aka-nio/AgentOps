# Token usage and cost tracking

This folder documents how to **measure tokens, elapsed time, and estimated cost** for work done by `ml_agents`: per agent, per operation, and for **end-to-end orchestrator flows**.

## Where data comes from

- **JSONL run logs:** `logs/agents-YYYY-MM-DD.jsonl` (see [Run logs](../run_logs/README.md)).
- **Kinds that matter:** `run_start`, `run_end`, `step` (including `deals_llm_round_*`, `graph_llm_usage`, `graph_node_*`), `tool`.
- **Graph CLI / `POST /invoke`:** print a top-level `llm_tokens` rollup for the **`graph_invoke`** run; nested agents (e.g. `agent_deals`) have their **own** `runId` and lines in the same file with `agent: "agent_deals"`.

## Documents

| Doc | Purpose |
|-----|---------|
| [Per-agent operations](per-agent-operations.md) | Averages / baselines by **agent** and **step** (tokens, time, estimated USD). |
| [Flow: orchestrator + promotions by SKU](flow-orchestrator-promotions-sku.md) | Example **multi-step flow** (orquestrador → `agent_deals` → `find_promotions_for_seller_sku`), timing and token breakdown. |

## Cost formula (manual)

Use the **current** [OpenAI pricing](https://openai.com/api/pricing/) for the model in use (default: `gpt-4o-mini` for orchestrator and deals).

For a run with input tokens \(P\) and output tokens \(C\):

\[
\text{USD} \approx P \cdot \text{price\_input\_per\_token} + C \cdot \text{price\_output\_per\_token}
\]

Prices are often quoted per 1M tokens; divide by \(10^6\) when applying to `prompt` / `completion` from logs.

## Updating the tables

1. Filter JSONL by `agent` and `step` / `tool`.
2. Sum `durationMs` for wall-time by phase; sum `tokens` for LLM rows.
3. Recompute averages when you have enough runs (e.g. ≥ 20 per operation).
4. Record the **date** and **model** in each table so stale pricing is obvious.
