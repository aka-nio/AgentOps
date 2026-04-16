import { runAgentQuestions } from "./agent.js";

const limitRaw = process.env.AGENT_QUESTIONS_LIMIT;
const limit = limitRaw ? Number(limitRaw) : undefined;
const payloadPath = process.env.AGENT_QUESTIONS_INPUT_PATH;

const dryRun = process.argv.includes("--dry-run") || process.env.AGENT_QUESTIONS_DRY_RUN === "1";

await runAgentQuestions({
  limit: Number.isFinite(limit) ? limit : undefined,
  dryRun,
  payloadPath
});
