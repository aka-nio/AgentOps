import { z } from "zod";
import { tool } from "@langchain/core/tools";
import { getAgentRunLogger } from "../../lib/agent-run-log.js";
import { fetchMercadoLivreProxyJson } from "../ml_proxy_fetch.js";
import { SellerPromotionsListResponseSchema } from "../types.js";
import { extractSkusFromMlItemPayload } from "./context_item_sku.js";

const normalizeSku = (s: string): string => s.trim().toLowerCase().replace(/\s+/g, "");

const skuMatches = (requested: string, fromItem: string): boolean => {
  if (!requested || !fromItem) {
    return false;
  }
  return normalizeSku(requested) === normalizeSku(fromItem);
};

/** Best-effort: pull Mercado Livre item ids from a seller-promotion items response. */
const extractItemIdsFromPromotionItemsResponse = (json: unknown): string[] => {
  const out: string[] = [];
  if (!json || typeof json !== "object") {
    return out;
  }
  const o = json as Record<string, unknown>;
  const results = o.results;
  if (!Array.isArray(results)) {
    return out;
  }
  for (const row of results) {
    if (row && typeof row === "object") {
      const id = (row as { id?: string }).id;
      if (typeof id === "string" && id.length > 0) {
        out.push(id);
      }
    }
  }
  return out;
};

const getPagingTotal = (json: unknown): number | undefined => {
  if (!json || typeof json !== "object") {
    return undefined;
  }
  const p = (json as { paging?: { total?: number } }).paging;
  return p && typeof p.total === "number" ? p.total : undefined;
};

export type FindPromotionsForSellerSkuResult = {
  seller_sku_requested: string;
  matching_promotions: Array<{
    promotion_id: string;
    promotion_type: string;
    status: string;
    name?: string;
    matching_item_ids: string[];
  }>;
  promotions_scanned: number;
  item_detail_lookups: number;
  truncated: boolean;
  notes: string[];
};

const runFindPromotionsForSku = async (args: {
  seller_sku: string;
  max_promotions_to_scan: number;
  max_item_detail_fetches: number;
  items_page_size: number;
}): Promise<FindPromotionsForSellerSkuResult> => {
  const target = args.seller_sku.trim();
  if (!target) {
    return {
      seller_sku_requested: target,
      matching_promotions: [],
      promotions_scanned: 0,
      item_detail_lookups: 0,
      truncated: false,
      notes: ["seller_sku is empty after trim"]
    };
  }

  const notes: string[] = [];
  let itemDetailLookups = 0;
  let truncated = false;

  const listJson = await fetchMercadoLivreProxyJson("/api/mercado-livre/seller-promotions", undefined);
  const list = SellerPromotionsListResponseSchema.parse(listJson);
  const promos = list.results.slice(0, args.max_promotions_to_scan);
  if (list.results.length > args.max_promotions_to_scan) {
    truncated = true;
    notes.push(
      `List had ${list.results.length} invitation(s); only first ${args.max_promotions_to_scan} are scanned for SKU (configure tool args to raise cap).`
    );
  }

  const matching: FindPromotionsForSellerSkuResult["matching_promotions"] = [];

  for (const p of promos) {
    if (itemDetailLookups >= args.max_item_detail_fetches) {
      truncated = true;
      notes.push(`Stopped: reached max_item_detail_fetches=${args.max_item_detail_fetches}`);
      break;
    }

    const promotionId = p.id;
    const promotionType = p.type;
    const pageSize = Math.max(1, Math.min(100, args.items_page_size));
    const collectedIds: string[] = [];
    let offset = 0;
    const maxPages = 50;

    for (let page = 0; page < maxPages; page++) {
      if (itemDetailLookups >= args.max_item_detail_fetches) {
        truncated = true;
        break;
      }
      let itemsJson: unknown;
      try {
        itemsJson = await fetchMercadoLivreProxyJson(
          `/api/mercado-livre/seller-promotions/${encodeURIComponent(promotionId)}/items`,
          {
            promotion_type: promotionType,
            limit: String(pageSize),
            offset: String(offset)
          }
        );
      } catch {
        notes.push(`Skipped items for ${promotionId} (${promotionType}): request failed`);
        break;
      }

      const ids = extractItemIdsFromPromotionItemsResponse(itemsJson);
      if (ids.length === 0) {
        break;
      }
      collectedIds.push(...ids);
      const total = getPagingTotal(itemsJson);
      offset += pageSize;
      if (ids.length < pageSize) {
        break;
      }
      if (total !== undefined && offset >= total) {
        break;
      }
    }

    const uniqueIds = [...new Set(collectedIds)];
    const matchedItemIds: string[] = [];

    for (const itemId of uniqueIds) {
      if (itemDetailLookups >= args.max_item_detail_fetches) {
        truncated = true;
        break;
      }
      let itemJson: unknown;
      try {
        itemJson = await fetchMercadoLivreProxyJson(
          `/api/mercado-livre/items/${encodeURIComponent(itemId)}`,
          undefined
        );
        itemDetailLookups += 1;
      } catch {
        continue;
      }
      if (!itemJson || typeof itemJson !== "object") {
        continue;
      }
      const skus = extractSkusFromMlItemPayload(itemJson as Record<string, unknown>);
      if (skus.some((s) => skuMatches(target, s))) {
        matchedItemIds.push(itemId);
      }
    }

    if (matchedItemIds.length > 0) {
      matching.push({
        promotion_id: promotionId,
        promotion_type: promotionType,
        status: p.status,
        ...(typeof p.name === "string" ? { name: p.name } : {}),
        matching_item_ids: matchedItemIds
      });
    }
  }

  return {
    seller_sku_requested: target,
    matching_promotions: matching,
    promotions_scanned: promos.length,
    item_detail_lookups: itemDetailLookups,
    truncated,
    notes
  };
};

const FindPromotionsForSellerSkuInputSchema = z.object({
  seller_sku: z
    .string()
    .min(1)
    .describe(
      "Seller / internal product SKU the user asked for (e.g. from ERP or listing). Case-insensitive match against Mercado Livre item payload."
    ),
  max_promotions_to_scan: z
    .number()
    .int()
    .positive()
    .max(200)
    .optional()
    .describe("Max promotion invitations to scan (default 40)."),
  max_item_detail_fetches: z
    .number()
    .int()
    .positive()
    .max(2_000)
    .optional()
    .describe("Hard cap on GET /items lookups across the whole scan (default 250). Stops early when reached."),
  items_page_size: z
    .number()
    .int()
    .positive()
    .max(100)
    .optional()
    .describe("Page size for promotion items API (default 50).")
});

export const find_promotions_for_seller_sku = tool(
  async (raw: z.infer<typeof FindPromotionsForSellerSkuInputSchema>) => {
    const input = {
      seller_sku: raw.seller_sku,
      max_promotions_to_scan: raw.max_promotions_to_scan ?? 40,
      max_item_detail_fetches: raw.max_item_detail_fetches ?? 250,
      items_page_size: raw.items_page_size ?? 50
    };
    const run = async () =>
      runFindPromotionsForSku({
        seller_sku: input.seller_sku,
        max_promotions_to_scan: input.max_promotions_to_scan,
        max_item_detail_fetches: input.max_item_detail_fetches,
        items_page_size: input.items_page_size
      });
    const log = getAgentRunLogger();
    if (log) {
      return log.withTool("find_promotions_for_seller_sku", input, run, { subsystem: "mercado_livre_proxy" });
    }
    return run();
  },
  {
    name: "find_promotions_for_seller_sku",
    description:
      "Find which active promotion invitations include at least one listing whose seller SKU matches the given value. " +
      "The Mercado Livre API does not filter promotions by SKU directly, so this tool lists invitations, fetches each campaign's items, " +
      "loads each item's `/api/mercado-livre/items/:id` payload, and matches seller_sku (same logic as listing SKU fields). " +
      "Use when the user asks for promotions/campaigns 'com SKU', 'com o código', or 'com o produto' identified by an internal SKU. " +
      "Prefer this over manual loops when a SKU is involved.",
    schema: FindPromotionsForSellerSkuInputSchema
  }
);
