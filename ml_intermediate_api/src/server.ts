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
