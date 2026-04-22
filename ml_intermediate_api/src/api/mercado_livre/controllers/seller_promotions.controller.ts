import * as sellerPromotionsService from "../services/seller_promotions.service.js";

type Query = { promotion_type?: string };

export const fetchSellerPromotions = (query: Query) =>
  sellerPromotionsService.proxyMlListSellerPromotions({
    promotionType: query.promotion_type
  });
