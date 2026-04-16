# AgentOPsBase

Monorepo for an agentic system built around Mercado Livre question handling. It combines an API gateway, an LLM-powered agent layer, and a React test client.

## Projects

### `ml_intermediate_api` — API Gateway (Port 3000)

A Fastify REST API that acts as the intermediate layer between agents/clients and external services. It handles authentication, proxies Mercado Livre API calls, and persists question data locally.

**Responsibilities:**
- Authenticate against external auth providers and issue normalized JWTs
- Proxy Mercado Livre seller questions to internal consumers
- Store questions in PostgreSQL

**Stack:** Node.js · TypeScript · Fastify 5 · PostgreSQL 16 · Prisma 6 · Zod · JWT

**Key endpoints:**
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/external-auth/token` | Authenticate against upstream auth, returns JWT |
| `GET` | `/api/mercado-livre/questions` | Fetch unanswered seller questions from Mercado Livre |

See [`ml_intermediate_api/docs/API/`](ml_intermediate_api/docs/API/) for full endpoint documentation.

---

### `ml_agents` — Agent Service (Port 3002)

A LangChain/LangGraph agent service that orchestrates intelligent workflows. It exposes HTTP endpoints for invoking the agent graph and performing semantic vector search over embeddings stored in MongoDB Atlas.

**Responsibilities:**
- Run a LangGraph state machine agent that can invoke typed tools
- Fetch and batch-process unanswered Mercado Livre questions (CLI retriever)
- Perform semantic similarity search via MongoDB Atlas Vector Search
- Generate and store embeddings using OpenAI

**Stack:** Node.js · TypeScript · LangChain 1 · LangGraph 1 · MongoDB Atlas · OpenAI (text-embedding-3-small) · Zod

**Key endpoints:**
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check, reports vector store readiness |
| `POST` | `/invoke` | Invoke the agent graph with an input text |
| `POST` | `/vectors/search` | Semantic similarity search over stored embeddings |

**CLI scripts:**
```bash
npm run agent:retriever       # Fetch unanswered questions, save to JSON
npm run agent:retriever:dry   # Dry-run, logs output without writing
```

See [`ml_agents/docs/`](ml_agents/docs/) for agent usage documentation.

---

## Architecture

```
React Test Client (frontTest)
         │
         ▼
  ml_agents :3002                  ml_intermediate_api :3000
  ┌─────────────────────┐          ┌────────────────────────┐
  │ LangGraph Agent     │─────────>│ Fastify Gateway        │
  │ Tools:              │          │ - External Auth proxy  │
  │  fetch_ml_questions │          │ - Mercado Livre proxy  │
  │  summarize_text     │          └──────────┬─────────────┘
  └──────────┬──────────┘                     │
             │                                ▼
             ▼                         PostgreSQL
      MongoDB Atlas                  (Questions table)
    (Vector embeddings)
             │
             ▼
         OpenAI API
      (Embeddings model)
```

**Data flow:**
1. Agent receives a request via `/invoke`
2. Agent tools call `ml_intermediate_api` to fetch questions from Mercado Livre
3. Questions are stored in PostgreSQL; embeddings are stored in MongoDB
4. Semantic search runs against MongoDB Atlas Vector Search

---

## Getting Started

Each subproject has its own environment variables and Docker setup. Refer to the individual READMEs:

- [`ml_intermediate_api/README.md`](ml_intermediate_api/README.md)
- [`ml_agents/README.md`](ml_agents/README.md)
