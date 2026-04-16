# ML Agents documentation

Agent-specific guides (use these paths from the repo root; links work in GitHub and most Markdown viewers):

- [Agent retriever](agent_retriever/README.md) — Mercado Livre question payload CLI
- [Agent questions](agent_questions/README.md) — draft seller replies from prepared questions

## Run logs

Structured JSON lines per day: `logs/agents-YYYY-MM-DD.jsonl` (see `logs/README.md`). Emitted for `agent_retriever`, `agent_questions`, and `POST /invoke`.

## frontTest (optional UI)

From `frontTest/`, run `npm run dev`. Proxies are configured in `frontTest/vite.config.ts` (`/retriever-api`, `/ml-agents`). See `frontTest/.env.example`.
