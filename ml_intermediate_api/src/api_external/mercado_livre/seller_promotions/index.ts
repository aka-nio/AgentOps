// SPDX-License-Identifier: MIT
// Copyright (c) 2026 AgentOPsBase contributors
//
// Part of AgentOPsBase. You may use, modify, redistribute, and sell this work
// or derivatives (including commercially) without owing the copyright holders
// anything beyond what the MIT license requires. This file is licensed under
// the terms in the LICENSE file at the repository root. The software is
// provided "AS IS", without warranty; the copyright holders are not liable for
// this code or for what anyone does with it.
import { mercadoLivreGetJson } from "./http.js";
import {
  sellerPromotionsListResponseSchema,
  type SellerPromotionsListResponse
} from "./types.js";

/**
 * Lists all promotion invitations for the seller (DEAL, MARKETPLACE_CAMPAIGN, VOLUME, etc.).
 * @see https://developers.mercadolibre.com.ar/en_us/ship-products/manage-promotion
 */
export async function listSellerPromotionsForUser(
  userId: string
): Promise<SellerPromotionsListResponse> {
  const json = await mercadoLivreGetJson(
    `/seller-promotions/users/${encodeURIComponent(userId)}`,
    {}
  );
  return sellerPromotionsListResponseSchema.parse(json);
}

/** GET /seller-promotions/promotions/{id}?promotion_type=... */
export async function getSellerPromotionDetail(
  promotionId: string,
  promotionType: string
): Promise<unknown> {
  return mercadoLivreGetJson(`/seller-promotions/promotions/${encodeURIComponent(promotionId)}`, {
    promotion_type: promotionType
  });
}

export type SellerPromotionItemsQuery = {
  promotion_type: string;
  status?: string;
  status_item?: string;
  item_id?: string;
  limit?: string;
  offset?: string;
  search_after?: string;
};

/** GET /seller-promotions/promotions/{id}/items?promotion_type=...&... */
export async function getSellerPromotionItems(
  promotionId: string,
  params: SellerPromotionItemsQuery
): Promise<unknown> {
  return mercadoLivreGetJson(
    `/seller-promotions/promotions/${encodeURIComponent(promotionId)}/items`,
    {
      promotion_type: params.promotion_type,
      status: params.status,
      status_item: params.status_item,
      item_id: params.item_id,
      limit: params.limit,
      offset: params.offset,
      search_after: params.search_after
    }
  );
}

/** GET /seller-promotions/items/{itemId} */
export async function getSellerItemPromotionState(itemId: string): Promise<unknown> {
  return mercadoLivreGetJson(`/seller-promotions/items/${encodeURIComponent(itemId)}`, {});
}

/** GET /seller-promotions/candidates/{candidateId} */
export async function getSellerPromotionCandidate(candidateId: string): Promise<unknown> {
  return mercadoLivreGetJson(
    `/seller-promotions/candidates/${encodeURIComponent(candidateId)}`,
    {}
  );
}
