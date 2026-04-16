import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

const introspectionFileSchema = z.object({
  endpoints: z.array(
    z.object({
      path: z.string(),
      body: z.unknown().optional(),
    }),
  ),
});

export function normalizeMercadoLibrePath(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const withoutQuery = trimmed.split("?")[0] ?? trimmed;

  // Reject obvious traversal / odd separators
  if (withoutQuery.includes("..")) return null;
  if (withoutQuery.includes("\\")) return null;
  if (withoutQuery.includes("\0")) return null;

  let p = withoutQuery;
  if (!p.startsWith("/")) p = `/${p}`;

  // Collapse duplicate slashes (except leading)
  p = p.replace(/\/{2,}/g, "/");

  // Drop trailing slash for consistency (except root)
  if (p.length > 1 && p.endsWith("/")) {
    p = p.slice(0, -1);
  }

  if (p === "/") return null;
  return p;
}

function extractPathsFromUnknown(value: unknown, out: Set<string>) {
  if (typeof value === "string") {
    const n = normalizeMercadoLibrePath(value);
    if (n) out.add(n);
    return;
  }

  if (Array.isArray(value)) {
    for (const v of value) extractPathsFromUnknown(v, out);
    return;
  }

  if (value && typeof value === "object") {
    for (const v of Object.values(value as Record<string, unknown>)) {
      extractPathsFromUnknown(v, out);
    }
  }
}

function extractPathsFromOptionsBody(body: unknown, out: Set<string>) {
  if (!body || typeof body !== "object") return;

  const doc = body as {
    methods?: Array<{ example?: string }>;
    connections?: Record<string, string>;
    related_resources?: unknown;
  };

  for (const m of doc.methods ?? []) {
    if (typeof m.example === "string") {
      const n = normalizeMercadoLibrePath(m.example);
      if (n) out.add(n);
    }
  }

  if (doc.connections && typeof doc.connections === "object") {
    for (const v of Object.values(doc.connections)) {
      if (typeof v === "string") {
        const n = normalizeMercadoLibrePath(v);
        if (n) out.add(n);
      }
    }
  }

  extractPathsFromUnknown(doc.related_resources, out);
}

export async function loadMercadoLibreProxyAllowlistFromIntrospectionJson(
  filePath: string,
): Promise<string[]> {
  const resolved = path.resolve(filePath);
  const raw = await fs.readFile(resolved, "utf8");
  const json = JSON.parse(raw) as unknown;
  const parsed = introspectionFileSchema.parse(json);

  const out = new Set<string>();

  for (const endpoint of parsed.endpoints) {
    const p = normalizeMercadoLibrePath(endpoint.path);
    if (p) out.add(p);

    extractPathsFromOptionsBody(endpoint.body, out);
  }

  return [...out].sort((a, b) => a.localeCompare(b));
}

export function isPathAllowedByPrefixAllowlist(
  requestPath: string,
  allowlist: readonly string[],
): boolean {
  const normalized = normalizeMercadoLibrePath(requestPath);
  if (!normalized) return false;

  for (const prefix of allowlist) {
    if (normalized === prefix) return true;
    if (normalized.startsWith(`${prefix}/`)) return true;
  }

  return false;
}
