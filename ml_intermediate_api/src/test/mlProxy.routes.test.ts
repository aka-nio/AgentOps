import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import Fastify from "fastify";
import mercadoLivreMlProxyRoutes from "../api/mercado_livre/routes/mlProxy.routes.js";

describe("mercado livre ml proxy routes", () => {
  const originalFetch = globalThis.fetch;
  const originalToken = process.env.ML_TOKEN_SECRET;
  const originalIntrospectionPath = process.env.ML_API_INTROSPECTION_JSON_PATH;
  const originalUpstreamBase = process.env.ML_API_BASE_URL;

  let introspectionFile = "";

  beforeEach(async () => {
    vi.restoreAllMocks();

    process.env.ML_TOKEN_SECRET = "test_token";
    process.env.ML_API_BASE_URL = "https://api.test";

    introspectionFile = path.join(
      os.tmpdir(),
      `ml-introspection-${Date.now()}.json`,
    );

    await fs.writeFile(
      introspectionFile,
      JSON.stringify(
        {
          endpoints: [
            {
              path: "/countries",
              body: {
                methods: [{ method: "GET", example: "/countries" }],
              },
            },
          ],
        },
        null,
        2,
      ),
      "utf8",
    );

    process.env.ML_API_INTROSPECTION_JSON_PATH = introspectionFile;
  });

  afterEach(async () => {
    globalThis.fetch = originalFetch;

    process.env.ML_TOKEN_SECRET = originalToken;
    process.env.ML_API_INTROSPECTION_JSON_PATH = originalIntrospectionPath;
    process.env.ML_API_BASE_URL = originalUpstreamBase;

    if (introspectionFile) {
      await fs.rm(introspectionFile, { force: true });
    }
  });

  it("returns 404 when path is not allowlisted", async () => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const app = Fastify();
    await app.register(mercadoLivreMlProxyRoutes, { prefix: "/api/ml-proxy" });

    const response = await app.inject({
      method: "GET",
      url: "/api/ml-proxy/not-allowlisted",
    });

    expect(response.statusCode).toBe(404);
    expect(fetchMock).toHaveBeenCalledTimes(0);
  });

  it("forwards allowlisted paths, preserves query string, and injects Authorization", async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json; charset=utf-8" },
      });
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const app = Fastify();
    await app.register(mercadoLivreMlProxyRoutes, { prefix: "/api/ml-proxy" });

    const response = await app.inject({
      method: "GET",
      url: "/api/ml-proxy/countries/BR?foo=bar",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [calledUrl, calledInit] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];

    expect(calledUrl).toBe("https://api.test/countries/BR?foo=bar");
    expect(calledInit.method).toBe("GET");
    expect(calledInit.headers).toEqual(
      expect.objectContaining({
        authorization: "Bearer test_token",
      }),
    );
  });
});
