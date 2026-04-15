import type { FastifyInstance } from "fastify";
import { z } from "zod";
import * as candidateController from "../controllers/candidate.controller.js";
import { conditionalAuth } from "../middleware/conditionalAuth.js";

export default async function candidateRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/candidate",
    { onRequest: [conditionalAuth] },
    async (request, reply) => {
      try {
        const { id } = request.query as { id?: string };
        if (id) {
          return reply.send(await candidateController.getCandidate(id));
        }

        return reply.send(await candidateController.listCandidates(request.query));
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply
            .code(400)
            .send({ error: "Validation error", details: error.issues });
        }

        if (error instanceof Error && error.message === "Candidate not found") {
          return reply.code(404).send({ error: "Not found", message: error.message });
        }

        throw error;
      }
    }
  );

  fastify.post(
    "/candidate",
    { onRequest: [conditionalAuth] },
    async (request, reply) => {
      try {
        const created = await candidateController.createCandidate(request.body);
        return reply.code(201).send(created);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply
            .code(400)
            .send({ error: "Validation error", details: error.issues });
        }

        if (error instanceof Error && error.message === "Candidate already exists") {
          return reply.code(409).send({ error: "Conflict", message: error.message });
        }

        throw error;
      }
    }
  );

  fastify.put(
    "/candidate/:id",
    { onRequest: [conditionalAuth] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        return reply.send(await candidateController.updateCandidate(id, request.body));
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply
            .code(400)
            .send({ error: "Validation error", details: error.issues });
        }

        if (error instanceof Error && error.message === "Candidate not found") {
          return reply.code(404).send({ error: "Not found", message: error.message });
        }

        if (error instanceof Error && error.message === "Candidate already exists") {
          return reply.code(409).send({ error: "Conflict", message: error.message });
        }

        throw error;
      }
    }
  );

  fastify.delete(
    "/candidate/:id",
    { onRequest: [conditionalAuth] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        return reply.send(await candidateController.deleteCandidate(id));
      } catch (error) {
        if (error instanceof Error && error.message === "Candidate not found") {
          return reply.code(404).send({ error: "Not found", message: error.message });
        }

        throw error;
      }
    }
  );
}
