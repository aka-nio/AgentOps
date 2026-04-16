import { runAgentRetriever } from "./agent.js";

const limitRaw = process.env.RETRIEVER_LIMIT;
const limit = limitRaw ? Number(limitRaw) : undefined;

const dryRun = process.argv.includes("--dry-run") || process.env.RETRIEVER_DRY_RUN === "1";

await runAgentRetriever({
  limit: Number.isFinite(limit) ? limit : undefined,
  dryRun
});

