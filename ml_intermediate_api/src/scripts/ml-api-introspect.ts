import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";

type MercadoLibreOptionsDoc = {
  name?: string;
  description?: string;
  attributes?: unknown;
  methods?: Array<{
    method?: string;
    example?: string;
    description?: string;
  }>;
  related_resources?: unknown;
  connections?: Record<string, string>;
};

type IntrospectionEndpoint = {
  path: string;
  url: string;
  status: number;
  ok: boolean;
  contentType: string | null;
  body: MercadoLibreOptionsDoc | unknown;
  error?: string;
};

function normalizePath(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Accept absolute URLs on the same host, otherwise treat as path.
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const u = new URL(trimmed);
      return u.pathname || "/";
    } catch {
      return null;
    }
  }

  if (!trimmed.startsWith("/")) {
    return `/${trimmed}`;
  }

  return trimmed;
}

function dedupePush(queue: string[], seenQueue: Set<string>, next: string | null) {
  if (!next) return;
  if (seenQueue.has(next)) return;
  seenQueue.add(next);
  queue.push(next);
}

function extractPathsFromOptionsDoc(
  doc: MercadoLibreOptionsDoc,
): { paths: string[]; templates: string[] } {
  const paths: string[] = [];
  const templates: string[] = [];

  for (const m of doc.methods ?? []) {
    const example = m.example;
    if (typeof example === "string") {
      const normalized = normalizePath(example.split("?")[0] ?? example);
      if (normalized) paths.push(normalized);
    }
  }

  if (doc.connections && typeof doc.connections === "object") {
    for (const v of Object.values(doc.connections)) {
      if (typeof v !== "string") continue;
      if (v.includes(":")) {
        templates.push(v);
      } else {
        const normalized = normalizePath(v.split("?")[0] ?? v);
        if (normalized) paths.push(normalized);
      }
    }
  }

  const rr = doc.related_resources;
  if (Array.isArray(rr)) {
    for (const v of rr) {
      if (typeof v !== "string") continue;
      if (v.includes(":")) {
        templates.push(v);
      } else {
        const normalized = normalizePath(v.split("?")[0] ?? v);
        if (normalized) paths.push(normalized);
      }
    }
  }

  return { paths, templates };
}

function expandTemplate(template: string): string[] {
  // Best-effort expansion for common Mercado Libre patterns.
  // This is intentionally conservative: unknown templates are skipped.
  const out = new Set<string>();

  const add = (p: string | null) => {
    const n = normalizePath(p ?? "");
    if (n) out.add(n);
  };

  // Strip querystring if any
  const t = template.split("?")[0] ?? template;

  // Generic: remove trailing "/:param" segments repeatedly
  // e.g. /items/:id/pictures -> /items/:id -> /items
  let current = t;
  for (let i = 0; i < 8; i += 1) {
    add(current);
    if (!current.includes("/:")) break;
    const idx = current.lastIndexOf("/:");
    if (idx <= 0) break;
    current = current.slice(0, idx);
  }

  // Known concrete expansions (helps when OPTIONS is only meaningful on concrete paths)
  if (t.includes("/items/:")) {
    add("/items/MLB5473722652");
  }
  if (t.includes("/users/:")) {
    const sellerId = process.env.SELLER_ID;
    if (sellerId) add(`/users/${sellerId}`);
  }
  if (t.includes("/questions/:")) {
    // Without a real question id, we can't reliably expand.
  }

  return [...out];
}

async function ensureDirForFile(filePath: string) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

async function main() {
  const baseUrl = process.env.ML_API_BASE_URL ?? "https://api.mercadolibre.com";
  const outputPath =
    process.env.ML_API_INTROSPECTION_OUTPUT ??
    path.join("docs", "mercado_livre", "api_introspection.json");

  const maxEndpoints = Number(process.env.ML_API_INTROSPECTION_MAX ?? "2500");
  const concurrency = Math.max(
    1,
    Math.min(16, Number(process.env.ML_API_INTROSPECTION_CONCURRENCY ?? "6")),
  );

  const seedsRaw =
    process.env.ML_API_INTROSPECTION_SEEDS ??
    [
      "/sites",
      "/countries",
      "/currencies",
      "/categories",
      "/users",
      "/items",
      "/questions",
      "/orders",
      "/shipments",
      "/messages",
    ].join(",");

  const seeds = seedsRaw
    .split(",")
    .map((s) => normalizePath(s.trim()))
    .filter((s): s is string => Boolean(s));

  const token = process.env.ML_TOKEN_SECRET;

  const queue: string[] = [];
  const seenQueue = new Set<string>();
  for (const s of seeds) dedupePush(queue, seenQueue, s);

  const visited = new Set<string>();
  const endpoints: IntrospectionEndpoint[] = [];

  const headers: Record<string, string> = {
    accept: "application/json",
    "user-agent": "ml_intermediate_api-ml-api-introspect/1.0",
  };

  // Some Mercado Libre resources behave differently with/without auth.
  // Keep it optional: if token exists, attach it.
  if (token) {
    headers.authorization = `Bearer ${token}`;
  }

  async function fetchOptions(path: string): Promise<IntrospectionEndpoint> {
    const url = new URL(path, baseUrl).toString();
    try {
      const response = await fetch(url, { method: "OPTIONS", headers });
      const contentType = response.headers.get("content-type");
      const text = await response.text();

      let body: unknown = text;
      try {
        body = text ? (JSON.parse(text) as unknown) : null;
      } catch {
        // keep raw text
      }

      return {
        path,
        url,
        status: response.status,
        ok: response.ok,
        contentType,
        body,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        path,
        url,
        status: 0,
        ok: false,
        contentType: null,
        body: null,
        error: message,
      };
    }
  }

  let nextIndex = 0;

  function shiftNextPath(): string | null {
    while (nextIndex < queue.length) {
      const candidate = queue[nextIndex];
      nextIndex += 1;
      if (!candidate) continue;
      if (visited.has(candidate)) continue;
      return candidate;
    }
    return null;
  }

  async function worker() {
    while (endpoints.length < maxEndpoints) {
      const path = shiftNextPath();
      if (!path) return;

      visited.add(path);

      const record = await fetchOptions(path);
      endpoints.push(record);

      if (record.ok && record.body && typeof record.body === "object") {
        const { paths, templates } = extractPathsFromOptionsDoc(
          record.body as MercadoLibreOptionsDoc,
        );

        for (const p of paths) {
          if (endpoints.length >= maxEndpoints) break;
          dedupePush(queue, seenQueue, p);
        }

        for (const tmpl of templates) {
          for (const expanded of expandTemplate(tmpl)) {
            if (endpoints.length >= maxEndpoints) break;
            dedupePush(queue, seenQueue, expanded);
          }
        }
      }
    }
  }

  // Keep pulling work until the queue is drained (queue may grow while workers run).
  // We spin up workers repeatedly to keep concurrency high without missing newly-enqueued paths.
  while (endpoints.length < maxEndpoints) {
    if (nextIndex >= queue.length) break;

    const workers = Array.from({ length: concurrency }, () => worker());
    await Promise.all(workers);

    // If nothing new got enqueued and we've consumed the queue, stop.
    if (nextIndex >= queue.length) break;
  }

  const meta = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    seeds,
    counts: {
      queued: queue.length,
      visited: visited.size,
      recorded: endpoints.length,
    },
    limits: {
      maxEndpoints,
      concurrency,
    },
    notes: [
      "This file is generated by running `npm run ml-api-introspect`.",
      "Mercado Libre exposes resource 'contracts' via HTTP OPTIONS on API paths (see official docs).",
      "Crawling is best-effort: some paths require valid ids, some endpoints may be blocked by edge policies, and discovery quality depends on seeds + graph expansion.",
    ],
  };

  await ensureDirForFile(outputPath);
  await fs.writeFile(
    outputPath,
    `${JSON.stringify({ meta, endpoints }, null, 2)}\n`,
    "utf8",
  );

  // eslint-disable-next-line no-console
  console.log(`Wrote introspection to ${outputPath}`);
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  // eslint-disable-next-line no-console
  console.error(`[ml-api-introspect] FAILED: ${message}`);
  process.exit(1);
});
