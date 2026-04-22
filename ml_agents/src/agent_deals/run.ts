import { runAgentDeals } from "./agent.js";

const promotionType = process.env.AGENT_DEALS_PROMOTION_TYPE?.trim() || undefined;
const dryRun = process.argv.includes("--dry-run") || process.env.AGENT_DEALS_DRY_RUN === "1";

await runAgentDeals({
  promotionType: promotionType || undefined,
  dryRun
});
