import type { FastifyInstance } from "fastify";
import candidateRoutes from "./candidate.routes.js";

export default async function mainProtectedRoutes(
  fastifyInstance: FastifyInstance
) {
  fastifyInstance.register(candidateRoutes, { prefix: "/api" });
}
