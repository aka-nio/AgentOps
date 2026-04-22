## ML Agents Starter

Basic starter with:

- **Node.js + TypeScript**
- **Zod** for validation and type safety
- **LangChain + LangGraph** for agent orchestration
- **MongoDB + Atlas Vector Search** support
- **Docker** for local app/database setup

## Docs

Project documentation lives under [`docs/`](docs/README.md).

- **[Documentation index](docs/README.md)** — navigation to all agent guides; **[agent graph (Mermaid)](docs/README.md#agent-graph)** maps `orquestrador` → tools → replan loop
- **[Agent retriever](docs/agent_retriever/README.md)** — run and validate the Mercado Livre retriever CLI
- **[Agent questions](docs/agent_questions/README.md)** — run and validate the question-answering agent
- **[Agent deals](docs/agent_deals/README.md)** — list promotion invitations (seller-promotions)
- **[Orchestrator CLI](docs/orchestrator/README.md)** — run the multi-step orchestrator from CLI
- **[Run logs](docs/run_logs/README.md)** — inspect JSONL run and LLM telemetry entries
- **[frontTest UI](docs/frontTest/README.md)** — run and configure the React test client

Use the docs folder as the source of truth for agent-specific behavior, usage, and navigation.
