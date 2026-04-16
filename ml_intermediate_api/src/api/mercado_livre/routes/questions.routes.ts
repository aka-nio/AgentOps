import type { FastifyInstance } from "fastify";
import * as questionsController from "../controllers/questions.controller.js";

export default async function mercadoLivreQuestionsRoutes(
  fastify: FastifyInstance,
) {
  fastify.get("/mercado-livre/questions", async (_request, reply) => {
    try {
      const questions = await questionsController.fetchSellerQuestions();
      return reply.send(questions);
    } catch (error) {
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

