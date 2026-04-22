import { z } from "zod";
import { tool } from "@langchain/core/tools";
import { getAgentRunLogger } from "../../lib/agent-run-log.js";
import { env } from "../../config/env.js";
import { ItemSkuByAnuncioResultSchema, type ItemSkuByAnuncioResult } from "../types.js";
import { logAndWrapAgentDealsError, logHttpErrorAndThrow } from "../diagnostics.js";

const FetchSkuByAnuncioInputSchema = z.object({
  anuncio_id: z
    .string()
    .min(1, "anuncio_id is required")
    .describe(
      "Mercado Livre listing (anúncio) id — same as item id in the API, e.g. MLB1234567890"
    )
});

const SKU_ATTR_IDS = new Set(["SELLER_SKU", "SKU"]);

const pushSku = (out: Set<string>, value: unknown): void => {
  if (typeof value === "string") {
    const t = value.trim();
    if (t) {
      out.add(t);
    }
  }
};

/**
 * Collects seller-facing SKU strings from a Mercado Livre /items response body.
 * Shapes differ by catalog vs classic and by category.
 */
export function extractSkusFromMlItemPayload(item: Record<string, unknown>): string[] {
  const out = new Set<string>();
  pushSku(out, item.seller_sku);

  const attrs = item.attributes;
  if (Array.isArray(attrs)) {
    for (const raw of attrs) {
      if (!raw || typeof raw !== "object") {
        continue;
      }
      const a = raw as { id?: string; value_name?: string };
      const id = a.id;
      if (typeof id === "string" && (SKU_ATTR_IDS.has(id) || /sku/i.test(id))) {
        pushSku(out, a.value_name);
      }
    }
  }

  const variations = item.variations;
  if (Array.isArray(variations)) {
    for (const raw of variations) {
      if (!raw || typeof raw !== "object") {
        continue;
      }
      const v = raw as Record<string, unknown>;
      pushSku(out, v.seller_sku);
      const vattrs = v.attributes;
      if (Array.isArray(vattrs)) {
        for (const rawA of vattrs) {
          if (!rawA || typeof rawA !== "object") {
            continue;
          }
          const a = rawA as { id?: string; value_name?: string };
          const id = a.id;
          if (typeof id === "string" && (SKU_ATTR_IDS.has(id) || /sku/i.test(id))) {
            pushSku(out, a.value_name);
          }
        }
      }
    }
  }

  return [...out];
}

export const fetch_ml_sku_by_anuncio_id = tool(
  async ({ anuncio_id }: z.infer<typeof FetchSkuByAnuncioInputSchema>) => {
    const input = { anuncio_id };
    const id = anuncio_id.trim();

    const run = async (): Promise<ItemSkuByAnuncioResult> => {
      const baseUrl = env.RETRIEVER_PROXY_ML_URL.replace(/\/+$/, "");
      const url = new URL(`${baseUrl}/api/mercado-livre/items/${encodeURIComponent(id)}`);
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
        console.error("[agent_deals] invalid JSON from proxy (sku tool)", {
          url: href,
          rawPreview: rawText.slice(0, 500)
        });
        throw err instanceof Error ? err : new Error(String(err));
      }

      if (!json || typeof json !== "object") {
        throw new Error("Item response is not a JSON object");
      }

      const item = json as Record<string, unknown>;
      const itemId = typeof item.id === "string" ? item.id : id;
      const skus = extractSkusFromMlItemPayload(item);
      return ItemSkuByAnuncioResultSchema.parse({
        anuncio_id: id,
        item_id: itemId,
        skus,
        sku_not_found: skus.length === 0
      });
    };

    const log = getAgentRunLogger();
    if (log) {
      return log.withTool("fetch_ml_sku_by_anuncio_id", input, run, { subsystem: "mercado_livre_proxy" });
    }
    return run();
  },
  {
    name: "fetch_ml_sku_by_anuncio_id",
    description:
      "Get seller SKU value(s) for a Mercado Livre listing. Pass anuncio_id (the public item/listing id, e.g. MLB...); calls GET /api/mercado-livre/items/:id on the retriever proxy and reads seller_sku / SELLER_SKU attributes. Returns all distinct SKUs when the listing has variations.",
    schema: FetchSkuByAnuncioInputSchema
  }
);
