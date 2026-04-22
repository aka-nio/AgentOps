import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { z } from "zod";
import { runAgentQuestionsWithResult } from "./agent_questions/agent.js";
import { PreparedQuestionsPayloadSchema } from "./agent_questions/ag_questions_type.js";
import { env } from "./config/env.js";
import { withAgentRunLog } from "./lib/agent-run-log.js";
import { invokeAgentGraphWithTelemetry } from "./graph/graph-invoke.js";
import { closeMongoClient } from "./lib/mongodb.js";
import { getVectorStore } from "./lib/vector-store.js";

const invokeSchema = z.object({
  input: z.string().min(1)
});

const searchSchema = z.object({
  query: z.string().min(1),
  k: z.number().int().positive().max(20).default(3)
});

const agentQuestionsRunSchema = z.object({
  limit: z.number().int().positive().max(25).optional(),
  dryRun: z.boolean().optional(),
  persist: z.boolean().optional(),
  /** When omitted, the server loads `src/agent_retriever/outputs/unanswered-questions.json` relative to the agent package (may be missing until the retriever has run). */
  payload: PreparedQuestionsPayloadSchema.optional()
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

const runOrchestrator = async (input: string) =>
  withAgentRunLog(
    "graph_invoke",
    { inputLength: input.length, input_preview: input.slice(0, 240), source: "http" },
    async (log) => invokeAgentGraphWithTelemetry(input, log)
  );

const server = createServer(async (req, res) => {
  try {
    if (!req.url || !req.method) {
      return sendJson(res, 400, { error: "Invalid request." });
    }

    if (req.method === "GET" && (req.url === "/health" || req.url === "/graph-health")) {
      return sendJson(res, 200, {
        status: "ok",
        environment: env.NODE_ENV,
        vectorSearchReady: env.MONGODB_URI.includes("mongodb.net")
      });
    }

    if (req.method === "POST" && (req.url === "/invoke" || req.url === "/orchestrator/run")) {
      const body = await parseJsonBody(req, invokeSchema);
      const result = await runOrchestrator(body.input);
      return sendJson(res, 200, {
        runId: result.runId,
        output: result.output,
        orchestration: result.orchestration,
        llm_tokens: result.llm_tokens,
        trace: result.trace,
        planner_depth: result.planner_depth
      });
    }

    if (req.method === "POST" && req.url === "/vectors/search") {
      const body = await parseJsonBody(req, searchSchema);
      const store = await getVectorStore();
      const docs = await store.similaritySearch(body.query, body.k);
      return sendJson(res, 200, { matches: docs });
    }

    if (req.method === "POST" && req.url === "/agent-questions/run") {
      const body = await parseJsonBody(req, agentQuestionsRunSchema);
      const result = await runAgentQuestionsWithResult({
        limit: body.limit,
        dryRun: body.dryRun ?? false,
        persist: body.persist,
        prepared: body.payload
      });
      return sendJson(res, 200, result);
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

    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      return sendJson(res, 400, {
        error: "Questions payload not found. POST a `payload` from the retriever, or run the retriever to write unanswered questions to disk."
      });
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
