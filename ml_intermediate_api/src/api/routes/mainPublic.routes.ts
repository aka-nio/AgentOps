import type { FastifyInstance } from "fastify";
import externalAuthRoutes from "../external_auth/routes/token.routes.js";
import mercadoLivreItemsRoutes from "../mercado_livre/routes/items.routes.js";
import mercadoLivreQuestionsRoutes from "../mercado_livre/routes/questions.routes.js";

export default async function mainPublicRoutes(
  fastifyInstance: FastifyInstance,
) {
  fastifyInstance.register(externalAuthRoutes, { prefix: "/api" });
  fastifyInstance.register(mercadoLivreQuestionsRoutes, { prefix: "/api" });
  fastifyInstance.register(mercadoLivreItemsRoutes, { prefix: "/api" });
}



