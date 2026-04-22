import { z } from "zod";
import { tool } from "@langchain/core/tools";
import { getAgentRunLogger } from "../../lib/agent-run-log.js";
import { env } from "../../config/env.js";
import { SellerPromotionsListResponseSchema } from "../types.js";
import { logAndWrapAgentDealsError, logHttpErrorAndThrow } from "../diagnostics.js";

const FetchDealsInputSchema = z.object({
  promotion_type: z
    .string()
    .optional()
    .describe("Optional filter: exact `type` from Mercado Livre (e.g. DEAL, VOLUME). Omit to return all invitations.")
});

export const fetch_ml_seller_promotions = tool(
  async ({ promotion_type }: z.infer<typeof FetchDealsInputSchema>) => {
    const input = { promotion_type };
    const run = async () => {
      const baseUrl = env.RETRIEVER_PROXY_ML_URL.replace(/\/+$/, "");
      const url = new URL(`${baseUrl}/api/mercado-livre/seller-promotions`);
      if (promotion_type?.trim()) {
        url.searchParams.set("promotion_type", promotion_type.trim());
      }

      const href = url.toString();
      let res: Response;
      try {
        res = await fetch(href, {
          headers: { accept: "application/json" }
        });
      } catch (err) {
        throw logAndWrapAgentDealsError(err, { url: href, stage: "fetch" });
      }

      const rawText = await res.text();
      if (!res.ok) {
        logHttpErrorAndThrow({
          url: href,
          status: res.status,
          statusText: res.statusText,
          bodyText: rawText
        });
      }

      let json: unknown;
      try {
        json = rawText.length > 0 ? JSON.parse(rawText) : {};
      } catch (err) {
        console.error("[agent_deals] invalid JSON from proxy", {
          url: href,
          rawPreview: rawText.slice(0, 500)
        });
        throw err instanceof Error ? err : new Error(String(err));
      }

      try {
        return SellerPromotionsListResponseSchema.parse(json);
      } catch (err) {
        console.error("[agent_deals] response schema mismatch", {
          url: href,
          parseError: err instanceof Error ? err.message : String(err),
          jsonPreview: JSON.stringify(json).slice(0, 800)
        });
        throw err instanceof Error ? err : new Error(String(err));
      }
    };

    const log = getAgentRunLogger();
    if (log) {
      return log.withTool("fetch_ml_seller_promotions", input, run, { subsystem: "mercado_livre_proxy" });
    }
    return run();
  },
  {
    name: "fetch_ml_seller_promotions",
    description:
      "List Mercado Livre promotion invitations for the configured seller (GET /api/mercado-livre/seller-promotions). Optional promotion_type filters by campaign type (e.g. DEAL).",
    schema: FetchDealsInputSchema
  }
);
