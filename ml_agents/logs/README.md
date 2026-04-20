# Agent run logs

Structured logs are appended as **JSON Lines** (one JSON object per line) when agents run:

- `logs/agents-YYYY-MM-DD.jsonl`

## Event kinds

| `kind`       | Meaning |
|-------------|---------|
| `run_start` | Run began (`agent`, `runId`, `ts`, plus any run-level metadata). |
| `step`      | A named phase finished (`step`, `durationMs`, optional `questionId`, `ok`, …). LLM steps may include `tokens: { prompt, completion, total }` when the provider reports usage (OpenAI via LangChain `usage_metadata`). LangGraph runs (`agent`=`graph_invoke`) also emit `graph_node_*` steps per node, `graph_langgraph` for the whole compiled graph, and `graph_llm_usage` per OpenAI chat completion (including nested `agent_questions` calls) with `source: "langchain_callback"`. |
| `tool`      | A LangChain tool invocation (`tool`, `durationMs`, `input` summary, `ok`, …). Mercado proxy tools add `subsystem: "mercado_livre_proxy"` (HTTP from ml_agents to `RETRIEVER_PROXY_ML_URL`). |
| `run_end`   | Run finished (`durationMs` for whole run, `ok`, optional `error`). When any LLM step reported tokens, includes `llm_tokens_cumulative` (`prompt`, `completion`, `total`, `interactions`). |

Enable by running agents as usual (CLI, `POST /invoke`, or `POST /agent-questions/run`); no extra env flag is required.

`POST /invoke` returns `runId` and `llm_tokens` (same cumulative shape as `run_end.llm_tokens_cumulative`) for quick inspection; the detailed per-LLM breakdown is in `graph_llm_usage` lines in the JSONL file.

Log files are listed in `.gitignore` (`logs/*.jsonl`) so they are not committed by default.
