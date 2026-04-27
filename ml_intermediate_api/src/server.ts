// SPDX-License-Identifier: MIT
// Copyright (c) 2026 AgentOPsBase contributors
//
// Part of AgentOPsBase. You may use, modify, redistribute, and sell this work
// or derivatives (including commercially) without owing the copyright holders
// anything beyond what the MIT license requires. This file is licensed under
// the terms in the LICENSE file at the repository root. The software is
// provided "AS IS", without warranty; the copyright holders are not liable for
// this code or for what anyone does with it.
import "dotenv/config";
import Fastify from "fastify";
import mlAgentsUpstreamProxy from "./api/ml_agents_proxy/mlAgentsUpstream.proxy.js";
import mainProtectedRoutes from "./api/routes/mainProtected.routes.js";
import mainPublicRoutes from "./api/routes/mainPublic.routes.js";

/** Default 3001 avoids clashing with ml_agents (`src/server.ts`), which defaults to PORT 3000. */
const port = Number(process.env.PORT ?? 3001);

const app = Fastify({
  logger: true,
});

app.setErrorHandler((error, request, reply) => {
  request.log.error(error);
  reply.code(500).send({ error: "Internal Server Error" });
});

app.get("/health", async () => ({ ok: true }));

await app.register(mlAgentsUpstreamProxy);
await app.register(mainPublicRoutes);
await app.register(mainProtectedRoutes);

const start = async () => {
  try {
    await app.listen({ port, host: "0.0.0.0" });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

void start();
