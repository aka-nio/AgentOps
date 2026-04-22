import { listSellerPromotionsForUser } from "../../../api_external/mercado_livre/seller_promotions/index.js";
import type { MercadoLivreSellerPromotionsResponse } from "../types/seller_promotions.types.js";

// proxy_ml: thin proxy over Mercado Libre seller-promotions API
export async function proxyMlListSellerPromotions(
  options: { promotionType?: string } = {}
): Promise<MercadoLivreSellerPromotionsResponse> {
  try {
    const sellerId = process.env.SELLER_ID;
    if (!sellerId) {
      throw new Error("Mercado Livre env is invalid");
    }

    const raw = await listSellerPromotionsForUser(sellerId);
    const filterType = options.promotionType?.trim();
    if (!filterType) {
      return raw;
    }

    const results = raw.results.filter((r) => r.type === filterType);
    return {
      ...raw,
      results,
      paging: raw.paging
        ? { ...raw.paging, total: results.length, offset: 0 }
        : { offset: 0, limit: results.length, total: results.length }
    };
  } catch (error) {
    if (error instanceof Error && error.message === "Mercado Livre env is invalid") {
      throw error;
    }
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

    if (error instanceof Error && error.message.startsWith("Mercado Libre API error:")) {
      throw new Error("Mercado Livre request failed");
    }

    throw error;
  }
}
