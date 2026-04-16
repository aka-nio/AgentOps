import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { z } from "zod";
import { env } from "./config/env.js";
import { agentGraph } from "./graph/agent-graph.js";
import { closeMongoClient } from "./lib/mongodb.js";
import { getVectorStore } from "./lib/vector-store.js";

const invokeSchema = z.object({
  input: z.string().min(1)
});

const searchSchema = z.object({
  query: z.string().min(1),
  k: z.number().int().positive().max(20).default(3)
});

const parseJsonBody = async <T>(
  req: IncomingMessage,
  schema: z.ZodType<T>
): Promise<T> => {
  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    chunks.push(Buffer.from(chunk));
  }

  const rawBody = Buffer.concat(chunks).toString("utf8");
  const jsonBody = rawBody.length > 0 ? JSON.parse(rawBody) : {};
  return schema.parse(jsonBody);
};

const sendJson = (res: ServerResponse, statusCode: number, payload: unknown): void => {
  res.writeHead(statusCode, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
};

const server = createServer(async (req, res) => {
  try {
    if (!req.url || !req.method) {
      return sendJson(res, 400, { error: "Invalid request." });
    }

    if (req.method === "GET" && req.url === "/health") {
      return sendJson(res, 200, {
        status: "ok",
        environment: env.NODE_ENV,
        vectorSearchReady: env.MONGODB_URI.includes("mongodb.net")
      });
    }

    if (req.method === "POST" && req.url === "/invoke") {
      const body = await parseJsonBody(req, invokeSchema);
      const result = await agentGraph.invoke({ input: body.input });
      return sendJson(res, 200, { output: result.output });
    }

    if (req.method === "POST" && req.url === "/vectors/search") {
      const body = await parseJsonBody(req, searchSchema);
      const store = await getVectorStore();
      const docs = await store.similaritySearch(body.query, body.k);
      return sendJson(res, 200, { matches: docs });
    }

    return sendJson(res, 404, { error: "Route not found." });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendJson(res, 400, {
        error: "Validation error.",
        issues: error.issues
      });
    }

    if (error instanceof SyntaxError) {
      return sendJson(res, 400, { error: "Body must be valid JSON." });
    }

    console.error("Unhandled request error:", error);
    return sendJson(res, 500, { error: "Internal server error." });
  }
});

server.listen(env.PORT, () => {
  console.log(`Server running on http://localhost:${env.PORT}`);
});

const shutdown = async (): Promise<void> => {
  await closeMongoClient();
  server.close(() => {
    process.exit(0);
  });
};

process.on("SIGINT", () => {
  void shutdown();
});
process.on("SIGTERM", () => {
  void shutdown();
});
