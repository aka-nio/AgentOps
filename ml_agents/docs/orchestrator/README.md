# Orchestrator CLI

This guide explains how to run the LangGraph orchestrator from the command line.

The orchestrator routes natural-language requests to one step at a time (`agent_retriever`, `agent_questions`, `vector_search`, `help`) and can chain steps in a single execution (for example retriever -> questions).

**Graph topology:** see the Mermaid diagram and notes in the [ML Agents documentation index](../README.md#agent-graph) (source: `ml_agents/src/graph/agent-graph.ts`).

## Script

- `npm run orchestrator -- "<message>"`
- Package script source: `ml_agents/src/graph/run-orchestrator.ts`

## Prerequisites

Required for typical "retrieve unanswered and draft answers" flows:

- `ml_intermediate_api` running (proxy target for Mercado Livre routes)
- `RETRIEVER_PROXY_ML_URL` set in `ml_agents/.env` (example: `http://localhost:3001`)
- `OPENAI_API_KEY` set in `ml_agents/.env` (required for `agent_questions`)

## Run

From `ml_agents/`:

```bash
npm run orchestrator -- "busque perguntas nao respondidas e rascunhe respostas"
```

From repo root (workspace mode):

```bash
npm run orchestrator -w ml_agents -- "fetch unanswered questions and draft seller replies"
```

Dry-run example:

```bash
npm run orchestrator -- "dry run: buscar perguntas nao respondidas e rascunhar respostas"
```

## HTTP API

The Node server now exposes a dedicated orchestrator endpoint.

- `POST /orchestrator/run` (preferred)
- `POST /invoke` (backward-compatible alias)

Request body:

```json
{
  "input": "busque perguntas nao respondidas e rascunhe respostas"
}
```

Example:

```bash
curl -X POST http://localhost:3000/orchestrator/run \
  -H "content-type: application/json" \
  -d '{"input":"fetch unanswered questions and draft seller replies"}'
```

Response includes:

- `runId`
- `output`
- `orchestration`
- `llm_tokens`
- `trace`
- `planner_depth`

## What gets produced

When orchestrator runs retriever + questions successfully:

- Retriever output: `src/agent_retriever/outputs/unanswered-questions.json`
- Questions outputs:
  - `src/agent_questions/outputs/answers-created.json`
  - `src/agent_questions/outputs/answers-history.json`

CLI output includes:

- `runId`
- chosen route and reason
- optional planning trace
- aggregated `llm_tokens` usage

## Troubleshooting

- `ML proxy unreachable` or fetch errors:
  - verify `ml_intermediate_api` is running
  - verify `RETRIEVER_PROXY_ML_URL`
- `OPENAI_API_KEY` missing:
  - set key in `ml_agents/.env` before running answer generation
- no input message:
  - command requires a quoted prompt after `--`
