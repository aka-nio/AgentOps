import { z } from "zod";
import { tool } from "@langchain/core/tools";
import { env } from "../../config/env.js";
import { MercadoLivreItemPayloadSchema } from "../types.js";

const FetchItemInputSchema = z.object({
  item_id: z
    .string()
    .min(1, "item_id is required")
    .describe("Mercado Livre item id, e.g. MLB1234567890")
});

export const fetch_ml_item = tool(
  async ({ item_id }: z.infer<typeof FetchItemInputSchema>) => {
    const baseUrl = env.RETRIEVER_PROXY_ML_URL.replace(/\/+$/, "");
    const url = new URL(`${baseUrl}/api/mercado-livre/items/${encodeURIComponent(item_id)}`);

    const res = await fetch(url.toString(), {
      headers: { accept: "application/json" }
    });

    if (!res.ok) {
      throw new Error(`Proxy request failed: ${res.status} ${res.statusText}`);
    }

    const json = await res.json();
    return MercadoLivreItemPayloadSchema.parse(json);
  },
  {
    name: "fetch_ml_item",
    description:
      "Fetch Mercado Livre item details from the retriever proxy API (/api/mercado-livre/items/:itemId).",
    schema: FetchItemInputSchema
  }
);
