## How To Use Questions Agent

This document explains how to run and use the questions agent area in this project.

## What It Covers

The questions agent area is intended for operations around question workflows, including:

- reading questions from the Mercado Livre proxy API
- organizing agent-specific logic under `src/agent_questions/`
- keeping agent docs under `docs/agent_questions/`

## Current Relevant Pieces

- HTTP server: `src/server.ts`
- base graph: `src/graph/agent-graph.ts`
- tools: `src/tools/exampleTool.ts`
- docs index: `docs/agent_questions/README.md`

## Environment Setup

1. Copy the example env file:

```bash
cp .env.example .env
```

2. Review the important variables:

- `PORT`
- `MONGODB_URI`
- `MONGODB_DB_NAME`
- `MONGODB_VECTOR_COLLECTION`
- `MONGODB_VECTOR_INDEX`
- `OPENAI_API_KEY`
- `EMBEDDING_MODEL`

Note:

- In `.env.example`, `PORT` is `3002`
- The Mercado Livre proxy referenced by the tool is `http://localhost:3001`

## Install And Run

Install dependencies:

```bash
npm install
```

Start the app:

```bash
npm run dev
```

Type-check when needed:

```bash
npm run typecheck
```

## HTTP Endpoints

### Health

```bash
curl http://localhost:3002/health
```

### Invoke the current graph

```bash
curl -X POST http://localhost:3002/invoke \
  -H "Content-Type: application/json" \
  -d '{ "input": "hello from client" }'
```

Example response:

```json
{
  "output": "Agent reply: hello from client"
}
```

### Vector search

```bash
curl -X POST http://localhost:3002/vectors/search \
  -H "Content-Type: application/json" \
  -d '{ "query": "some text", "k": 3 }'
```

## Questions Tool

The Mercado Livre questions tool is currently defined in `src/tools/exampleTool.ts`.

Tool name:

- `fetch_mercado_livre_questions`

It calls:

- `http://localhost:3001/mercado-livre/questions`

Supported filter values:

- `UNANSWERED`: ainda abertas, sem resposta
- `ANSWERED`: ja respondidas
- `CLOSED_UNANSWERED`: fechadas sem resposta
- `BANNED`: banidas, texto vazio

The tool validates both:

- input arguments with Zod
- response payloads with Zod

This keeps the agent integration type-safe.

## Response Shape

Successful responses from the proxy are validated against the typed schema:

```json
{
  "total": 22,
  "limit": 50,
  "questions": [
    {
      "id": 13400843830,
      "item_id": "MLB5473722652",
      "seller_id": 314921332,
      "status": "CLOSED_UNANSWERED",
      "text": "Eu também comprei ela e não está ligando por nada , ...",
      "date_created": "2025-08-11T16:53:07.525835807-04:00"
    }
  ]
}
```

## Next Structure Recommendation

As new agents are added:

- keep source code inside `src/agent_questions/`
- keep usage and operational docs inside `docs/agent_questions/`
- add each new agent doc to `docs/agent_questions/README.md`
