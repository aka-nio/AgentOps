# Agent run logs

Structured logs are appended as JSON Lines (one JSON object per line) when agents run:

- `logs/agents-YYYY-MM-DD.jsonl`

## Event kinds

| `kind`       | Meaning |
|-------------|---------|
| `run_start` | Run began (`agent`, `runId`, `ts`, plus any run-level metadata). |
| `step`      | A named phase finished (`step`, `durationMs`, optional `questionId`, `ok`, ...). LLM steps may include `tokens: { prompt, completion, total }` when provider usage is available. LangGraph runs (`agent`=`graph_invoke`) also emit `graph_node_*`, `graph_langgraph`, and `graph_llm_usage` entries. |
| `tool`      | A LangChain tool invocation (`tool`, `durationMs`, `input` summary, `ok`, ...). Mercado proxy tools add `subsystem: "mercado_livre_proxy"` (HTTP from ml_agents to `RETRIEVER_PROXY_ML_URL`). |
| `run_end`   | Run finished (`durationMs`, `ok`, optional `error`). When available, includes cumulative `llm_tokens_cumulative` (`prompt`, `completion`, `total`, `interactions`). |

Enable by running agents as usual (CLI, `POST /invoke`, or `POST /agent-questions/run`); no extra env flag is required.

`POST /invoke` returns `runId` and `llm_tokens` for quick inspection. Detailed per-LLM breakdown is recorded in `graph_llm_usage` lines in the JSONL file.

Log files are ignored by default (`logs/*.jsonl` in `.gitignore`).
