import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import path from "node:path";
import { loadMercadoLibreProxyAllowlistFromIntrospectionJson } from "../ml_proxy/allowlist.js";
import { extractProxiedPath, forwardMercadoLibreProxyRequest } from "../services/mlProxy.service.js";

export default async function mercadoLivreMlProxyRoutes(fastify: FastifyInstance) {
  // Preserve arbitrary request bodies (JSON, urlencoded, raw) for proxying.
  fastify.addContentTypeParser("*", { parseAs: "buffer" }, (_request, body, done) => {
    done(null, body);
  });

  const introspectionPath =
    process.env.ML_API_INTROSPECTION_JSON_PATH?.trim() ||
    path.join(process.cwd(), "docs", "mercado_livre", "api_introspection.json");

  const allowlist = await loadMercadoLibreProxyAllowlistFromIntrospectionJson(
    introspectionPath,
  );

  const handler = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const proxiedPath = extractProxiedPath(request);
      if (!proxiedPath) {
        return reply.code(404).send({ error: "Not found", message: "Invalid proxy path" });
      }

      await forwardMercadoLibreProxyRequest({ request, reply, proxiedPath, allowlist });
    } catch (error) {
      if (error instanceof Error && error.message === "ML_PROXY_PATH_NOT_ALLOWED") {
        return reply.code(404).send({ error: "Not found", message: "Path is not allowlisted" });
      }

      throw error;
    }
  };

  // `/api/ml-proxy` (exact) and everything under it.
  fastify.all("/", handler);
  fastify.all("/*", handler);
}
