import {
  getSellerItemPromotionState,
  getSellerPromotionCandidate,
  getSellerPromotionDetail,
  getSellerPromotionItems,
  listSellerPromotionsForUser,
  type SellerPromotionItemsQuery
} from "../../../api_external/mercado_livre/seller_promotions/index.js";
import type { MercadoLivreSellerPromotionsResponse } from "../types/seller_promotions.types.js";

// proxy_ml: thin proxy over Mercado Libre seller-promotions API

function mapProxyMlError(error: unknown): never {
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

function requireSellerId(): string {
  const sellerId = process.env.SELLER_ID;
  if (!sellerId) {
    throw new Error("Mercado Livre env is invalid");
  }
  return sellerId;
}

export async function proxyMlListSellerPromotions(
  options: { promotionType?: string } = {}
): Promise<MercadoLivreSellerPromotionsResponse> {
  try {
    const raw = await listSellerPromotionsForUser(requireSellerId());
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
    mapProxyMlError(error);
  }
}

export async function proxyMlGetSellerPromotion(
  promotionId: string,
  promotionType: string
): Promise<unknown> {
  try {
    return await getSellerPromotionDetail(promotionId, promotionType);
  } catch (error) {
    mapProxyMlError(error);
  }
}

export async function proxyMlGetSellerPromotionItems(
  promotionId: string,
  query: SellerPromotionItemsQuery
): Promise<unknown> {
  try {
    return await getSellerPromotionItems(promotionId, query);
  } catch (error) {
    mapProxyMlError(error);
  }
}

export async function proxyMlGetItemPromotionState(itemId: string): Promise<unknown> {
  try {
    return await getSellerItemPromotionState(itemId);
  } catch (error) {
    mapProxyMlError(error);
  }
}

export async function proxyMlGetPromotionCandidate(candidateId: string): Promise<unknown> {
  try {
    return await getSellerPromotionCandidate(candidateId);
  } catch (error) {
    mapProxyMlError(error);
  }
}
