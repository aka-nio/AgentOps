// SPDX-License-Identifier: MIT
// Copyright (c) 2026 AgentOPsBase contributors
//
// Part of AgentOPsBase. You may use, modify, redistribute, and sell this work
// or derivatives (including commercially) without owing the copyright holders
// anything beyond what the MIT license requires. This file is licensed under
// the terms in the LICENSE file at the repository root. The software is
// provided "AS IS", without warranty; the copyright holders are not liable for
// this code or for what anyone does with it.
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

const requireUpstreamBase = (): string | null => {
  const base = process.env.ML_AGENTS_SERVER_URL?.trim().replace(/\/+$/, "");
  return base && base.length > 0 ? base : null;
};

const noUpstream = (reply: FastifyReply) =>
  reply.status(503).send({
    error: "Service unavailable",
    message:
      "ML_AGENTS_SERVER_URL is not set. Point it at the ml_agents Node server (e.g. http://127.0.0.1:3000) and restart."
  });

const forwardJson = async (
  reply: FastifyReply,
  url: string,
  init: RequestInit
): Promise<FastifyReply> => {
  const res = await fetch(url, init);
  const text = await res.text();
  const contentType = res.headers.get("content-type") ?? "application/json; charset=utf-8";

  if (contentType.includes("application/json") && text.length > 0) {
    try {
      return reply.status(res.status).header("content-type", contentType).send(JSON.parse(text) as unknown);
    } catch {
      return reply.status(res.status).header("content-type", contentType).send(text);
    }
  }

  return reply.status(res.status).header("content-type", contentType).send(text);
};

/**
 * Proxies selected routes to ml_agents `src/server.ts` so frontTest can use one host (this API on PORT 3001).
 */
export default async function mlAgentsUpstreamProxy(fastify: FastifyInstance) {
  fastify.post(
    "/agent-questions/run",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const base = requireUpstreamBase();
      if (!base) {
        return noUpstream(reply);
      }

      return forwardJson(reply, `${base}/agent-questions/run`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json"
        },
        body: JSON.stringify(request.body ?? {})
      });
    }
  );

  fastify.post("/agent-deals/run", async (request: FastifyRequest, reply: FastifyReply) => {
    const base = requireUpstreamBase();
    if (!base) {
      return noUpstream(reply);
    }

    return forwardJson(reply, `${base}/agent-deals/run`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json"
      },
      body: JSON.stringify(request.body ?? {})
    });
  });

  fastify.post("/invoke", async (request: FastifyRequest, reply: FastifyReply) => {
    const base = requireUpstreamBase();
    if (!base) {
      return noUpstream(reply);
    }

    return forwardJson(reply, `${base}/invoke`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json"
      },
      body: JSON.stringify(request.body ?? {})
    });
  });

  /** frontTest calls `/ml-agents/graph-health` so this API’s `GET /health` stays separate from ml_agents. */
  fastify.get("/graph-health", async (_request: FastifyRequest, reply: FastifyReply) => {
    const base = requireUpstreamBase();
    if (!base) {
      return noUpstream(reply);
    }

    return forwardJson(reply, `${base}/health`, { method: "GET", headers: { accept: "application/json" } });
  });
}
