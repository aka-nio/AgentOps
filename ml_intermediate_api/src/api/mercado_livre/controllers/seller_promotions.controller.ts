// SPDX-License-Identifier: MIT
// Copyright (c) 2026 AgentOPsBase contributors
//
// Part of AgentOPsBase. You may use, modify, redistribute, and sell this work
// or derivatives (including commercially) without owing the copyright holders
// anything beyond what the MIT license requires. This file is licensed under
// the terms in the LICENSE file at the repository root. The software is
// provided "AS IS", without warranty; the copyright holders are not liable for
// this code or for what anyone does with it.
import * as sellerPromotionsService from "../services/seller_promotions.service.js";
import type { SellerPromotionItemsQuery } from "../../../api_external/mercado_livre/seller_promotions/index.js";

type ListQuery = { promotion_type?: string };

export const fetchSellerPromotions = (query: ListQuery) =>
  sellerPromotionsService.proxyMlListSellerPromotions({
    promotionType: query.promotion_type
  });

type DetailQuery = { promotion_type: string };

export const fetchSellerPromotion = (params: { promotionId: string }, query: DetailQuery) =>
  sellerPromotionsService.proxyMlGetSellerPromotion(
    params.promotionId,
    query.promotion_type
  );

type ItemsQuery = {
  promotion_type: string;
  status?: string;
  status_item?: string;
  item_id?: string;
  limit?: string;
  offset?: string;
  search_after?: string;
};

export const fetchSellerPromotionItems = (
  params: { promotionId: string },
  query: ItemsQuery
) => {
  const q: SellerPromotionItemsQuery = {
    promotion_type: query.promotion_type,
    status: query.status,
    status_item: query.status_item,
    item_id: query.item_id,
    limit: query.limit,
    offset: query.offset,
    search_after: query.search_after
  };
  return sellerPromotionsService.proxyMlGetSellerPromotionItems(params.promotionId, q);
};

export const fetchItemPromotionState = (params: { itemId: string }) =>
  sellerPromotionsService.proxyMlGetItemPromotionState(params.itemId);

export const fetchSellerPromotionCandidate = (params: { candidateId: string }) =>
  sellerPromotionsService.proxyMlGetPromotionCandidate(params.candidateId);
