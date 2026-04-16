## Agent Retriever

This document explains how to run and validate the `agent_retriever` implementation.

**Navigation:** [Documentation index](../README.md) · [Agent questions](../agent_questions/README.md)

## Current Retriever Implementation

`agent_retriever` currently does:

- call the Mercado Livre proxy route `/api/mercado-livre/questions`
- request questions with `status=UNANSWERED`
- filter unanswered questions
- prepare a payload and save it under `src/agent_retriever/outputs/unanswered-questions.json`

## Relevant Files

- `src/agent_retriever/run.ts`: entrypoint for retriever scripts
- `src/agent_retriever/agent.ts`: main retriever flow
- `src/agent_retriever/tools/`: LangChain tools for proxy calls (`fetch_ml_questions`, `fetch_ml_item`)
- `src/agent_retriever/types.ts`: Zod schemas and TypeScript types
- `src/agent_retriever/RULES.md`: policy/rules for agent behavior
- `docs/agent_retriever/README.md`: retriever docs

## Environment

Copy the example env file if needed:

```bash
cp .env.example .env
```

Required for retriever:

- `RETRIEVER_PROXY_ML_URL`

Example:

```env
RETRIEVER_PROXY_ML_URL=http://localhost:3001
```

## Run

Install dependencies (if not installed yet):

```bash
npm install
```

Dry-run (no output file write):

```bash
npm run agent:retriever:dry
```

Real run (writes output file):

```bash
npm run agent:retriever
```

Optional: limit how many unanswered questions are prepared:

```bash
RETRIEVER_LIMIT=5 npm run agent:retriever
```

## Proxy Route

Retriever tools call the Mercado Livre API (for example **ml_intermediate_api** under the `/api` prefix). Targets:

- `GET {RETRIEVER_PROXY_ML_URL}/api/mercado-livre/questions?status=UNANSWERED`
- `GET {RETRIEVER_PROXY_ML_URL}/api/mercado-livre/items/{itemId}`

In **frontTest**, the Vite dev proxy maps `GET /retriever-api/api/mercado-livre/questions?...` to the same paths on `VITE_RETRIEVER_PROXY_ML_URL`.

Supported statuses in types/schemas:

- `UNANSWERED`
- `ANSWERED`
- `CLOSED_UNANSWERED`
- `BANNED`

## Output

On real run, output is written to:

- `src/agent_retriever/outputs/unanswered-questions.json`

Format:

```json
{
  "total": 2,
  "questions": [
    {
      "id": 123,
      "item_id": "MLB...",
      "seller_id": 999,
      "status": "UNANSWERED",
      "text": "...",
      "date_created": "..."
    }
  ]
}
```

## Logging

Runs started via `npm run agent:retriever` emit JSON lines under `logs/agents-YYYY-MM-DD.jsonl`:

- Top-level `agent` is **`agent_retriever`** (`run_start` / `run_end`).
- Mercado HTTP is performed by the **`fetch_ml_questions`** tool, which logs as `kind: "tool"` with `subsystem: "mercado_livre_proxy"` (same shared tools as `agent_questions`).

The **retriever agent** is a separate CLI from **agent questions**. frontTest “Run agent questions” only calls the ml_agents HTTP handler for **`agent_questions`**, so you will not see a new `agent_retriever` run in logs until you run the retriever script (or another code path that calls `runAgentRetriever`).

## Mercado traffic from ml_agents

Both agents call the Mercado Livre API **from the Node process** using `RETRIEVER_PROXY_ML_URL` in **`ml_agents/.env`** (plain `fetch` to `{RETRIEVER_PROXY_ML_URL}/api/mercado-livre/...`). That is **not** the browser `frontTest` Vite proxy; Vite is only for the React dev UI.

## Validation and Type Safety

`agent_retriever` is type-safe using Zod + TypeScript:

- input schema for tool arguments
- response schema for proxy payload
- inferred TS types in runtime code
