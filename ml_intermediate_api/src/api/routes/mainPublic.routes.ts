// SPDX-License-Identifier: MIT
// Copyright (c) 2026 AgentOPsBase contributors
//
// Part of AgentOPsBase. You may use, modify, redistribute, and sell this work
// or derivatives (including commercially) without owing the copyright holders
// anything beyond what the MIT license requires. This file is licensed under
// the terms in the LICENSE file at the repository root. The software is
// provided "AS IS", without warranty; the copyright holders are not liable for
// this code or for what anyone does with it.
import type { FastifyInstance } from "fastify";
import externalAuthRoutes from "../external_auth/routes/token.routes.js";
import mercadoLivreItemsRoutes from "../mercado_livre/routes/items.routes.js";
import mercadoLivreQuestionsRoutes from "../mercado_livre/routes/questions.routes.js";
import mercadoLivreUsersRoutes from "../mercado_livre/routes/users.routes.js";
import mercadoLivreSellerPromotionsRoutes from "../mercado_livre/routes/seller_promotions.routes.js";

export default async function mainPublicRoutes(
  fastifyInstance: FastifyInstance,
) {
  fastifyInstance.register(externalAuthRoutes, { prefix: "/api" });
  fastifyInstance.register(mercadoLivreQuestionsRoutes, { prefix: "/api" });
  fastifyInstance.register(mercadoLivreItemsRoutes, { prefix: "/api" });
  fastifyInstance.register(mercadoLivreUsersRoutes, { prefix: "/api" });
  fastifyInstance.register(mercadoLivreSellerPromotionsRoutes, { prefix: "/api" });
}



