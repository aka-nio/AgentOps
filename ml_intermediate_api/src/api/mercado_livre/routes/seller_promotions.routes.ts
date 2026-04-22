import type { FastifyInstance, FastifyReply } from "fastify";
import * as sellerPromotionsController from "../controllers/seller_promotions.controller.js";

const handleProxyMlError = (error: unknown, reply: FastifyReply): boolean => {
  if (error instanceof Error && error.message === "Mercado Livre env is invalid") {
    void reply.code(500).send({ error: "Configuration error", message: error.message });
    return true;
  }
  if (error instanceof Error && error.message === "Mercado Livre unauthorized") {
    void reply.code(401).send({ error: "Unauthorized", message: error.message });
    return true;
  }
  if (error instanceof Error && error.message === "Mercado Livre forbidden") {
    void reply.code(403).send({ error: "Forbidden", message: error.message });
    return true;
  }
  if (error instanceof Error && error.message === "Mercado Livre request failed") {
    void reply.code(502).send({ error: "Bad gateway", message: error.message });
    return true;
  }
  return false;
};

export default async function mercadoLivreSellerPromotionsRoutes(
  fastify: FastifyInstance
) {
  // List (must stay distinct from :promotionId)
  fastify.get("/mercado-livre/seller-promotions", async (request, reply) => {
    try {
      const query = request.query as { promotion_type?: string };
      const payload = await sellerPromotionsController.fetchSellerPromotions({
        promotion_type: query.promotion_type
      });
      return reply.send(payload);
    } catch (error) {
      if (handleProxyMlError(error, reply)) {
        return;
      }
      throw error;
    }
  });

  // More specific than :promotionId
  fastify.get("/mercado-livre/seller-promotions/items/:itemId", async (request, reply) => {
    try {
      const params = request.params as { itemId: string };
      const payload = await sellerPromotionsController.fetchItemPromotionState(params);
      return reply.send(payload);
    } catch (error) {
      if (handleProxyMlError(error, reply)) {
        return;
      }
      throw error;
    }
  });

  fastify.get(
    "/mercado-livre/seller-promotions/candidates/:candidateId",
    async (request, reply) => {
      try {
        const params = request.params as { candidateId: string };
        const payload = await sellerPromotionsController.fetchSellerPromotionCandidate(
          params
        );
        return reply.send(payload);
      } catch (error) {
        if (handleProxyMlError(error, reply)) {
          return;
        }
        throw error;
      }
    }
  );

  fastify.get(
    "/mercado-livre/seller-promotions/:promotionId/items",
    async (request, reply) => {
      const query = request.query as {
        promotion_type?: string;
        status?: string;
        status_item?: string;
        item_id?: string;
        limit?: string;
        offset?: string;
        search_after?: string;
      };
      if (!query.promotion_type?.trim()) {
        return reply
          .code(400)
          .send({ error: "Bad request", message: "Query param promotion_type is required" });
      }
      try {
        const params = request.params as { promotionId: string };
        const payload = await sellerPromotionsController.fetchSellerPromotionItems(
          params,
          {
            promotion_type: query.promotion_type,
            status: query.status,
            status_item: query.status_item,
            item_id: query.item_id,
            limit: query.limit,
            offset: query.offset,
            search_after: query.search_after
          }
        );
        return reply.send(payload);
      } catch (error) {
        if (handleProxyMlError(error, reply)) {
          return;
        }
        throw error;
      }
    }
  );

  // Promotion detail (last; requires promotion_type). Avoid shadowing /items and /candidates.
  fastify.get("/mercado-livre/seller-promotions/:promotionId", async (request, reply) => {
    const params = request.params as { promotionId: string };
    if (params.promotionId === "items" || params.promotionId === "candidates") {
      return reply.code(404).send({ error: "Not found" });
    }
    const query = request.query as { promotion_type?: string };
    if (!query.promotion_type?.trim()) {
      return reply
        .code(400)
        .send({ error: "Bad request", message: "Query param promotion_type is required" });
    }
    try {
      const payload = await sellerPromotionsController.fetchSellerPromotion(params, {
        promotion_type: query.promotion_type
      });
      return reply.send(payload);
    } catch (error) {
      if (handleProxyMlError(error, reply)) {
        return;
      }
      throw error;
    }
  });
}
