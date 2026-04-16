## Agent Questions

This document explains how to run and validate the `agent_questions` implementation.

## Current Questions Implementation

`agent_questions` currently does:

- read prepared unanswered questions payload (default from retriever output)
- filter `UNANSWERED` questions
- decide whether the buyer question needs listing/item details
- when needed, fetch item details via `fetch_ml_item` (`/mercado-livre/items/:itemId`)
- generate suggested answers with OpenAI `gpt-4o-mini`
- save JSON tracking files for latest run and history

## Relevant Files

- `src/agent_questions/run.ts`: entrypoint for questions scripts
- `src/agent_questions/agent.ts`: main questions flow
- `src/agent_questions/ag_questions_type.ts`: Zod schemas and TypeScript types for this agent
- `src/agent_questions/RULES.md`: policy/rules for agent behavior
- `src/agent_retriever/types.ts`: shared Mercado Livre Zod schemas/types
- `src/agent_retriever/tools/items.ts`: proxy tool used for optional item context (`fetch_ml_item`)
- `docs/agent_questions/README.md`: questions docs

## Environment

Copy the example env file if needed:

```bash
cp .env.example .env
```

Required for questions agent:

- `OPENAI_API_KEY`
- `RETRIEVER_PROXY_ML_URL` (only when item context fetch is needed)

Optional overrides:

- `AGENT_QUESTIONS_LIMIT`: maximum number of questions to process
- `AGENT_QUESTIONS_INPUT_PATH`: custom input payload path
- `AGENT_QUESTIONS_DRY_RUN=1`: dry-run mode

## Input Payload

Default input payload path:

- `src/agent_retriever/outputs/unanswered-questions.json`

Expected input shape:

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

## Run

Install dependencies (if not installed yet):

```bash
npm install
```

Dry-run (no JSON output files generated):

```bash
npm run agent:questions:dry
```

Real run (creates JSON tracking files only):

```bash
npm run agent:questions
```

Optional examples:

```bash
AGENT_QUESTIONS_LIMIT=5 npm run agent:questions
AGENT_QUESTIONS_INPUT_PATH=./custom/questions.json npm run agent:questions
```

## Output

On real run, outputs are written to:

- `src/agent_questions/outputs/answers-created.json`
- `src/agent_questions/outputs/answers-history.json`

Tracking file notes:

- `answers-created.json`: latest run summary
- `answers-history.json`: append-only history across runs

Each answer entry includes:

- `used_item_context`: whether listing data was fetched and injected into the prompt
- `item_context_error` (optional): populated if the item fetch failed

## Validation and Type Safety

`agent_questions` is type-safe using Zod + TypeScript:

- input payload is validated with a Zod schema before processing
- Mercado Livre question structure is shared from retriever types
- runtime code uses inferred TS types from schemas

