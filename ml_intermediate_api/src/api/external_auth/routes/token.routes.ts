import type { FastifyInstance } from "fastify";
import * as externalAuthController from "../controllers/token.controller.js";

export default async function externalAuthRoutes(fastify: FastifyInstance) {
  fastify.post("/external-auth/token", async (_request, reply) => {
    try {
      const token = await externalAuthController.authenticateWithExternalApi();
      return reply.send(token);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "External auth env is invalid"
      ) {
        return reply
          .code(500)
          .send({ error: "Configuration error", message: error.message });
      }

      if (
        error instanceof Error &&
        error.message === "External authentication failed"
      ) {
        return reply
          .code(401)
          .send({ error: "Unauthorized", message: error.message });
      }

      if (
        error instanceof Error &&
        error.message === "External auth unavailable"
      ) {
        return reply
          .code(502)
          .send({ error: "Bad gateway", message: error.message });
      }

      if (
        error instanceof Error &&
        (error.message === "External auth request failed" ||
          error.message === "Invalid external auth response")
      ) {
        return reply
          .code(502)
          .send({ error: "Bad gateway", message: error.message });
      }

      throw error;
    }
  });
}

