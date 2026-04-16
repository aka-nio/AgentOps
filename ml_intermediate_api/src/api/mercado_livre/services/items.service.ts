import { z, ZodError } from "zod";
import { getItemById } from "../../../api_external/mercado_livre/items/index.js";
import type { MercadoLivreItemResponse } from "../types/items.types.js";

const itemIdParamSchema = z
  .string()
  .min(6)
  .regex(/^ML[A-Z0-9]+$/i, "Invalid Mercado Livre item id format");

// proxy_ml: thin proxy over Mercado Livre external API
export async function proxyMlGetItemById(
  rawItemId: string,
): Promise<MercadoLivreItemResponse> {
  const parsed = itemIdParamSchema.safeParse(rawItemId);
  if (!parsed.success) {
    throw new Error("Mercado Livre item id is invalid");
  }

  const itemId = parsed.data;

  try {
    return await getItemById(itemId);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.startsWith("Missing required environment variable")
    ) {
      throw new Error("Mercado Livre env is invalid");
    }

    if (
      error instanceof Error &&
      error.message.startsWith("Mercado Libre API error: 401")
    ) {
      throw new Error("Mercado Livre unauthorized");
    }

    if (
      error instanceof Error &&
      error.message.startsWith("Mercado Libre API error: 403")
    ) {
      throw new Error("Mercado Livre forbidden");
    }

    if (
      error instanceof Error &&
      error.message.startsWith("Mercado Libre API error: 404")
    ) {
      throw new Error("Mercado Livre item not found");
    }

    if (error instanceof ZodError) {
      throw new Error("Mercado Livre item response is invalid");
    }

    if (
      error instanceof Error &&
      error.message.startsWith("Mercado Libre API error:")
    ) {
      throw new Error("Mercado Livre request failed");
    }

    throw error;
  }
}
