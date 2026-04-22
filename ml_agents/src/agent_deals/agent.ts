import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { withAgentRunLog } from "../lib/agent-run-log.js";
import { fetch_ml_seller_promotions } from "./tools/deals.js";
import type { SellerPromotionsListResponse } from "./types.js";
import { formatUnknownErrorForLog } from "./diagnostics.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export type RunAgentDealsOptions = {
  /** When set, only returns promotions where `type` matches (passed to the proxy as `promotion_type`). */
  promotionType?: string;
  dryRun?: boolean;
};

export type AgentDealsDryRunResult = {
  mode: "dry_run";
  would_list: number;
  promotion_type_filter: string | null;
  sample: Array<{ id: string; type: string; status: string; name?: string }>;
};

export type AgentDealsExecutedResult = {
  mode: "executed";
  output_path: string;
  response: SellerPromotionsListResponse;
};

export type AgentDealsRunResult = AgentDealsDryRunResult | AgentDealsExecutedResult;

const summarize = (r: SellerPromotionsListResponse): string => {
  const lines = r.results.map((p) => {
    const name = p.name ? ` name=${p.name}` : "";
    return `- ${p.id} type=${p.type} status=${p.status}${name}`;
  });
  const paging = r.paging ? ` (paging total=${r.paging.total})` : "";
  return [`${r.results.length} promotion(s)${paging}`, ...lines].join("\n");
};

export const runAgentDealsWithResult = async (
  options: RunAgentDealsOptions = {}
): Promise<AgentDealsRunResult> => {
  return withAgentRunLog(
    "agent_deals",
    { dryRun: Boolean(options.dryRun), promotionType: options.promotionType ?? null },
    async (log) => {
      const response = await fetch_ml_seller_promotions.invoke({
        promotion_type: options.promotionType
      });

      if (options.dryRun) {
        return {
          mode: "dry_run",
          would_list: response.results.length,
          promotion_type_filter: options.promotionType?.trim() ?? null,
          sample: response.results.slice(0, 8).map((p) => ({
            id: p.id,
            type: p.type,
            status: p.status,
            name: typeof p.name === "string" ? p.name : undefined
          }))
        };
      }

      const outPath = await log.withStep(
        "write_seller_promotions_payload",
        async () => {
          const outDir = path.join(__dirname, "outputs");
          await mkdir(outDir, { recursive: true });
          const targetPath = path.join(outDir, "seller-promotions.json");
          await writeFile(targetPath, JSON.stringify(response, null, 2), "utf8");
          return targetPath;
        },
        { resultCount: response.results.length }
      );

      return {
        mode: "executed",
        output_path: outPath,
        response
      };
    }
  );
};

export const runAgentDeals = async (options: RunAgentDealsOptions = {}): Promise<void> => {
  let result: AgentDealsRunResult;
  try {
    result = await runAgentDealsWithResult(options);
  } catch (err) {
    console.error("[agent_deals] runAgentDeals failed", {
      diagnostic: formatUnknownErrorForLog(err),
      ...(err instanceof Error && err.stack ? { stack: err.stack } : {})
    });
    throw err;
  }

  if (result.mode === "dry_run") {
    console.log(
      `[agent_deals] dry-run: would list ${result.would_list} row(s) filter=${result.promotion_type_filter ?? "none"}`
    );
    for (const row of result.sample) {
      console.log(`- ${row.id} ${row.type} ${row.status} ${row.name ?? ""}`.trim());
    }
    return;
  }

  console.log(summarize(result.response));
  console.log(`[agent_deals] wrote ${result.output_path}`);
};
