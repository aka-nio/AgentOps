// SPDX-License-Identifier: MIT
// Copyright (c) 2026 AgentOPsBase contributors
//
// Part of AgentOPsBase. You may use, modify, redistribute, and sell this work
// or derivatives (including commercially) without owing the copyright holders
// anything beyond what the MIT license requires. This file is licensed under
// the terms in the LICENSE file at the repository root. The software is
// provided "AS IS", without warranty; the copyright holders are not liable for
// this code or for what anyone does with it.
import { z } from "zod";
import { tool } from "@langchain/core/tools";
import { getAgentRunLogger } from "../../lib/agent-run-log.js";
import { fetchMercadoLivreProxyJson } from "../ml_proxy_fetch.js";
import { SellerPromotionsListResponseSchema } from "../types.js";
import { find_promotions_for_seller_sku } from "./promotions_by_sku_tool.js";

const FetchDealsListInputSchema = z.object({
  promotion_type: z
    .string()
    .optional()
    .describe(
      "Optional filter on invitation `type` from Mercado Livre (e.g. DEAL, VOLUME, SMART). Omit to return all invitations for the seller."
    )
});

export const fetch_ml_seller_promotions = tool(
  async ({ promotion_type }: z.infer<typeof FetchDealsListInputSchema>) => {
    const input = { promotion_type };
    const run = async () => {
      const json = await fetchMercadoLivreProxyJson("/api/mercado-livre/seller-promotions", {
        promotion_type: promotion_type?.trim() || undefined
      });
      try {
        return SellerPromotionsListResponseSchema.parse(json);
      } catch (err) {
        console.error("[agent_deals] list response schema mismatch", {
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
      "List all promotion invitations for the configured seller (GET /api/mercado-livre/seller-promotions). Use this first when the user needs an overview, promotion ids (e.g. P-MLB…), or to filter by campaign type. Returns `results` with id, type, status, name, dates.",
    schema: FetchDealsListInputSchema
  }
);

const FetchPromotionDetailInputSchema = z.object({
  promotion_id: z
    .string()
    .min(1)
    .describe("Promotion id from the list or user text, e.g. P-MLB17023040"),
  promotion_type: z
    .string()
    .min(1)
    .describe("Mercado Livre campaign type, e.g. DEAL, MARKETPLACE_CAMPAIGN, VOLUME, SMART. Must match the promotion.")
});

export const fetch_ml_seller_promotion_detail = tool(
  async ({ promotion_id, promotion_type }: z.infer<typeof FetchPromotionDetailInputSchema>) => {
    const input = { promotion_id, promotion_type };
    const run = async () => {
      const id = promotion_id.trim();
      return fetchMercadoLivreProxyJson(`/api/mercado-livre/seller-promotions/${encodeURIComponent(id)}`, {
        promotion_type: promotion_type.trim()
      });
    };
    const log = getAgentRunLogger();
    if (log) {
      return log.withTool("fetch_ml_seller_promotion_detail", input, run, { subsystem: "mercado_livre_proxy" });
    }
    return run();
  },
  {
    name: "fetch_ml_seller_promotion_detail",
    description:
      "Get a single promotion/campaign by id (GET /api/mercado-livre/seller-promotions/:promotionId?promotion_type=...). Both promotion_id and promotion_type are required by the API.",
    schema: FetchPromotionDetailInputSchema
  }
);

const FetchPromotionItemsInputSchema = z.object({
  promotion_id: z.string().min(1).describe("Promotion id, e.g. P-MLB17023040"),
  promotion_type: z.string().min(1).describe("Campaign type matching this promotion, e.g. DEAL or SMART"),
  status: z.string().optional().describe("Filter passthrough, e.g. from ML docs"),
  status_item: z.string().optional().describe("e.g. active, paused when supported"),
  item_id: z.string().optional().describe("Filter to a specific listing id"),
  limit: z.string().optional().describe("Page size"),
  offset: z.string().optional().describe("Offset"),
  search_after: z.string().optional().describe("Cursor from ML for pagination")
});

export const fetch_ml_seller_promotion_items = tool(
  async (args: z.infer<typeof FetchPromotionItemsInputSchema>) => {
    const input = { ...args };
    const run = async () => {
      const id = args.promotion_id.trim();
      return fetchMercadoLivreProxyJson(
        `/api/mercado-livre/seller-promotions/${encodeURIComponent(id)}/items`,
        {
          promotion_type: args.promotion_type.trim(),
          status: args.status?.trim() || undefined,
          status_item: args.status_item?.trim() || undefined,
          item_id: args.item_id?.trim() || undefined,
          limit: args.limit?.trim() || undefined,
          offset: args.offset?.trim() || undefined,
          search_after: args.search_after?.trim() || undefined
        }
      );
    };
    const log = getAgentRunLogger();
    if (log) {
      return log.withTool("fetch_ml_seller_promotion_items", input, run, { subsystem: "mercado_livre_proxy" });
    }
    return run();
  },
  {
    name: "fetch_ml_seller_promotion_items",
    description:
      "List or filter items under a specific promotion (GET /api/mercado-livre/seller-promotions/:promotionId/items?promotion_type=required&...). Use after you know promotion_id and its type. promotion_type is required by the API.",
    schema: FetchPromotionItemsInputSchema
  }
);

const FetchItemPromotionStateInputSchema = z.object({
  item_id: z
    .string()
    .min(1)
    .describe("Mercado Livre listing / item id, e.g. MLB1234567890")
});

export const fetch_ml_item_promotion_state = tool(
  async ({ item_id }: z.infer<typeof FetchItemPromotionStateInputSchema>) => {
    const input = { item_id };
    const run = async () => {
      return fetchMercadoLivreProxyJson(
        `/api/mercado-livre/seller-promotions/items/${encodeURIComponent(item_id.trim())}`,
        undefined
      );
    };
    const log = getAgentRunLogger();
    if (log) {
      return log.withTool("fetch_ml_item_promotion_state", input, run, { subsystem: "mercado_livre_proxy" });
    }
    return run();
  },
  {
    name: "fetch_ml_item_promotion_state",
    description:
      "Get promotion participation state and prices for one listing (GET /api/mercado-livre/seller-promotions/items/:itemId). Use when the user asks about promotions for a specific anúncio / item id.",
    schema: FetchItemPromotionStateInputSchema
  }
);

const FetchPromotionCandidateInputSchema = z.object({
  candidate_id: z
    .string()
    .min(1)
    .describe("Candidate id from Mercado Livre (e.g. from notifications or ML flows)")
});

export const fetch_ml_seller_promotion_candidate = tool(
  async ({ candidate_id }: z.infer<typeof FetchPromotionCandidateInputSchema>) => {
    const input = { candidate_id };
    const run = async () => {
      return fetchMercadoLivreProxyJson(
        `/api/mercado-livre/seller-promotions/candidates/${encodeURIComponent(candidate_id.trim())}`,
        undefined
      );
    };
    const log = getAgentRunLogger();
    if (log) {
      return log.withTool("fetch_ml_seller_promotion_candidate", input, run, { subsystem: "mercado_livre_proxy" });
    }
    return run();
  },
  {
    name: "fetch_ml_seller_promotion_candidate",
    description:
      "Resolve a promotion candidate resource by id (GET /api/mercado-livre/seller-promotions/candidates/:candidateId). Use when the user provides a candidate id.",
    schema: FetchPromotionCandidateInputSchema
  }
);

/** All Mercado Livre seller-promotion proxy tools for the deals LLM. */
export const ALL_DEALS_PROMOTION_TOOLS = [
  fetch_ml_seller_promotions,
  find_promotions_for_seller_sku,
  fetch_ml_seller_promotion_detail,
  fetch_ml_seller_promotion_items,
  fetch_ml_item_promotion_state,
  fetch_ml_seller_promotion_candidate
] as const;

export { fetch_ml_sku_by_anuncio_id, extractSkusFromMlItemPayload } from "./context_item_sku.js";
