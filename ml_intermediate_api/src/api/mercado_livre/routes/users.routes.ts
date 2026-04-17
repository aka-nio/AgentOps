import type { FastifyInstance } from "fastify";
import * as usersController from "../controllers/users.controller.js";

export default async function mercadoLivreUsersRoutes(
  fastify: FastifyInstance,
) {
  fastify.get("/mercado-livre/users/:sellerId", async (request, reply) => {
    try {
      const { sellerId } = request.params as { sellerId: string };
      const user = await usersController.fetchUserBySellerId(sellerId);
      return reply.send(user);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "Mercado Livre seller id is invalid"
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
        error.message === "Mercado Livre user not found"
      ) {
        return reply
          .code(404)
          .send({ error: "Not found", message: error.message });
      }

      if (
        error instanceof Error &&
        error.message === "Mercado Livre user response is invalid"
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
