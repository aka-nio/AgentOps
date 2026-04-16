import type { FastifyReply, FastifyRequest } from "fastify";
import { isPathAllowedByPrefixAllowlist } from "../ml_proxy/allowlist.js";

const DEFAULT_UPSTREAM_BASE = "https://api.mercadolibre.com";
const MAX_PATH_LEN = 2048;

export function getMercadoLibreUpstreamBaseUrl(): string {
  const raw = process.env.ML_API_BASE_URL?.trim() ?? DEFAULT_UPSTREAM_BASE;
  return raw.replace(/\/+$/, "");
}

export function extractProxiedPath(request: FastifyRequest): string | null {
  const rawUrl = request.raw.url ?? "/";
  const pathname = rawUrl.split("?")[0] ?? rawUrl;

  const marker = "/api/ml-proxy";

  let suffix: string;
  if (pathname === marker || pathname.startsWith(`${marker}/`)) {
    suffix = pathname.slice(marker.length);
  } else {
    // When the proxy plugin is registered with `prefix: "/api/ml-proxy"`, some versions expose
    // `raw.url` without repeating the mount prefix (e.g. `/countries/BR` instead of `/api/ml-proxy/...`).
    suffix = pathname;
  }

  if (suffix.length === 0) return "/";
  if (!suffix.startsWith("/")) {
    suffix = `/${suffix}`;
  }

  if (suffix.length > MAX_PATH_LEN) return null;
  if (suffix.includes("..")) return null;
  if (suffix.includes("\\")) return null;
  if (suffix.includes("\0")) return null;

  return suffix;
}

function pickForwardingHeaders(request: FastifyRequest): Record<string, string> {
  const headers: Record<string, string> = {};

  const accept = request.headers.accept;
  if (typeof accept === "string" && accept.length > 0) {
    headers.accept = accept;
  }

  const contentType = request.headers["content-type"];
  if (typeof contentType === "string" && contentType.length > 0) {
    headers["content-type"] = contentType;
  }

  const acceptLanguage = request.headers["accept-language"];
  if (typeof acceptLanguage === "string" && acceptLanguage.length > 0) {
    headers["accept-language"] = acceptLanguage;
  }

  return headers;
}

export async function forwardMercadoLibreProxyRequest(params: {
  request: FastifyRequest;
  reply: FastifyReply;
  proxiedPath: string;
  allowlist: readonly string[];
}): Promise<void> {
  const { request, reply, proxiedPath, allowlist } = params;

  if (!isPathAllowedByPrefixAllowlist(proxiedPath, allowlist)) {
    throw new Error("ML_PROXY_PATH_NOT_ALLOWED");
  }

  const token = process.env.ML_TOKEN_SECRET;
  if (!token) {
    return reply
      .code(500)
      .send({ error: "Configuration error", message: "ML_TOKEN_SECRET is required" });
  }

  const upstreamBase = getMercadoLibreUpstreamBaseUrl();
  const rawUrl = request.raw.url ?? "/";
  const searchIndex = rawUrl.indexOf("?");
  const search = searchIndex >= 0 ? rawUrl.slice(searchIndex) : "";

  const upstreamUrl = `${upstreamBase}${proxiedPath}${search}`;

  const forwardHeaders = pickForwardingHeaders(request);
  forwardHeaders.authorization = `Bearer ${token}`;

  const method = request.method.toUpperCase();

  const hasBody =
    method !== "GET" &&
    method !== "HEAD" &&
    method !== "OPTIONS" &&
    method !== "TRACE";

  const body =
    hasBody && Buffer.isBuffer(request.body)
      ? new Uint8Array(request.body)
      : undefined;

  const upstreamResponse = await fetch(upstreamUrl, {
    method,
    headers: forwardHeaders,
    body,
    redirect: "manual",
  });

  const contentType = upstreamResponse.headers.get("content-type");
  if (contentType) {
    reply.header("content-type", contentType);
  }

  const text = await upstreamResponse.text();

  if (contentType?.toLowerCase().includes("application/json") && text.length > 0) {
    try {
      return reply.code(upstreamResponse.status).send(JSON.parse(text) as unknown);
    } catch {
      return reply.code(upstreamResponse.status).send(text);
    }
  }

  return reply.code(upstreamResponse.status).send(text);
}
