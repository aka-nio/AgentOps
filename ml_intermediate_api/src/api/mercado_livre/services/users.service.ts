import { z, ZodError } from "zod";
import { getUserById } from "../../../api_external/mercado_livre/users/index.js";
import type { MercadoLivreUserResponse } from "../types/users.types.js";

const sellerIdParamSchema = z
  .string()
  .regex(/^\d+$/, "Seller id must be numeric");

// proxy_ml: thin proxy over Mercado Livre external API
export async function proxyMlGetUserBySellerId(
  rawSellerId: string,
): Promise<MercadoLivreUserResponse> {
  const parsed = sellerIdParamSchema.safeParse(rawSellerId.trim());
  if (!parsed.success) {
    throw new Error("Mercado Livre seller id is invalid");
  }

  const sellerId = parsed.data;

  try {
    return await getUserById(sellerId);
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
      throw new Error("Mercado Livre user not found");
    }

    if (error instanceof ZodError) {
      throw new Error("Mercado Livre user response is invalid");
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
