import type { FastifyInstance } from "fastify";
import * as itemsController from "../controllers/items.controller.js";

export default async function mercadoLivreItemsRoutes(fastify: FastifyInstance) {
  fastify.get("/mercado-livre/items/:itemId", async (request, reply) => {
    try {
      const { itemId } = request.params as { itemId: string };
      const item = await itemsController.fetchItemById(itemId);
      return reply.send(item);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "Mercado Livre item id is invalid"
      ) {
        return reply
          .code(400)
          .send({ error: "Bad request", message: error.message });
      }

      if (
        error instanceof Error &&
        error.message === "Mercado Livre env is invalid"
      ) {
        return reply
          .code(500)
          .send({ error: "Configuration error", message: error.message });
      }

      if (
        error instanceof Error &&
        error.message === "Mercado Livre unauthorized"
      ) {
        return reply
          .code(401)
          .send({ error: "Unauthorized", message: error.message });
      }

      if (
        error instanceof Error &&
        error.message === "Mercado Livre forbidden"
      ) {
        return reply
          .code(403)
          .send({ error: "Forbidden", message: error.message });
      }

      if (
        error instanceof Error &&
        error.message === "Mercado Livre item not found"
      ) {
        return reply
          .code(404)
          .send({ error: "Not found", message: error.message });
      }

      if (
        error instanceof Error &&
        error.message === "Mercado Livre item response is invalid"
      ) {
        return reply
          .code(502)
          .send({ error: "Bad gateway", message: error.message });
      }

      if (
        error instanceof Error &&
        error.message === "Mercado Livre request failed"
      ) {
        return reply
          .code(502)
          .send({ error: "Bad gateway", message: error.message });
      }

      throw error;
    }
  });
}
