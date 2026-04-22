import type { FastifyInstance } from "fastify";
import * as sellerPromotionsController from "../controllers/seller_promotions.controller.js";

export default async function mercadoLivreSellerPromotionsRoutes(
  fastify: FastifyInstance
) {
  fastify.get("/mercado-livre/seller-promotions", async (request, reply) => {
    try {
      const query = request.query as { promotion_type?: string };
      const payload = await sellerPromotionsController.fetchSellerPromotions({
        promotion_type: query.promotion_type
      });
      return reply.send(payload);
    } catch (error) {
      if (error instanceof Error && error.message === "Mercado Livre env is invalid") {
        return reply.code(500).send({ error: "Configuration error", message: error.message });
      }

      if (error instanceof Error && error.message === "Mercado Livre unauthorized") {
        return reply.code(401).send({ error: "Unauthorized", message: error.message });
      }

      if (error instanceof Error && error.message === "Mercado Livre forbidden") {
        return reply.code(403).send({ error: "Forbidden", message: error.message });
      }

      if (error instanceof Error && error.message === "Mercado Livre request failed") {
        return reply.code(502).send({ error: "Bad gateway", message: error.message });
      }

      throw error;
    }
  });
}
