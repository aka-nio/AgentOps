import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import { type MercadoLivreItemPayload, type MercadoLivreQuestion } from "../agent_retriever/types.js";
import { env } from "../config/env.js";
import { fetch_ml_item } from "../agent_retriever/tools/items.js";
import {
  ItemContextDecisionSchema,
  PreparedQuestionsPayloadSchema,
  type AgentQuestionsCompletedResult,
  type AgentQuestionsDryRunResult,
  type AgentQuestionsRunResult,
  type AnswersHistory,
  type AnswersRunLog,
  type DraftAnswerMeta,
  type DraftedAnswer,
  type PreparedQuestionsPayload,
  type RunAgentQuestionsOptions
} from "./ag_questions_type.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export type {
  AgentQuestionsCompletedResult,
  AgentQuestionsDryRunResult,
  AgentQuestionsRunResult,
  AnswersHistory,
  AnswersRunLog,
  DraftAnswerMeta,
  DraftedAnswer,
  PreparedQuestionsPayload,
  RunAgentQuestionsOptions
} from "./ag_questions_type.js";

const buildPrompt = (rules: string, question: MercadoLivreQuestion, itemContext?: string): string => {
  return [
    "You are agent_questions.",
    "",
    "Follow these rules:",
    rules.trim(),
    "",
    "Task:",
    "Draft a suggested seller reply to the Mercado Livre customer question below.",
    "Return ONLY the final answer text (no headings, no markdown fences).",
    "",
    itemContext
      ? [
          "Listing context (from our proxy; may be partial):",
          itemContext,
          "",
          "Use ONLY facts supported by the listing context above. If something is not present, do not invent it."
        ].join("\n")
      : "",
    "",
    "Question:",
    `- id: ${question.id}`,
    `- item_id: ${question.item_id}`,
    `- status: ${question.status}`,
    `- text: ${question.text || "(empty)"}`,
    `- date_created: ${question.date_created}`
  ].join("\n");
};

const getChatModel = (temperature: number): ChatOpenAI => {
  if (!env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required to draft answers.");
  }

  return new ChatOpenAI({
    apiKey: env.OPENAI_API_KEY,
    model: "gpt-4o-mini",
    temperature
  });
};

const decideNeedItemContext = async (question: MercadoLivreQuestion): Promise<z.infer<typeof ItemContextDecisionSchema>> => {
  const model = getChatModel(0);

  const prompt = [
    "You decide whether answering this buyer question requires Mercado Livre listing/item details.",
    "",
    "Return ONLY valid JSON with this exact shape:",
    '{ "need_item": boolean, "reason": string }',
    "",
    "Set need_item=true when the question asks for specifics that typically come from the listing, such as:",
    "- dimensions, weight, materials, compatibility, SKU/model, variations",
    "- what is included in the box, warranty terms stated in listing",
    "- shipping/handling details that depend on listing configuration",
    "",
    "Set need_item=false when a generic polite response is enough without listing facts.",
    "",
    "Question:",
    `- item_id: ${question.item_id}`,
    `- text: ${question.text || "(empty)"}`
  ].join("\n");

  const result = await model.invoke(prompt);
  const raw = typeof result.content === "string" ? result.content : JSON.stringify(result.content);

  try {
    const json: unknown = JSON.parse(raw.trim());
    return ItemContextDecisionSchema.parse(json);
  } catch (error) {
    console.warn(`[agent_questions] item-context decision parse failed; defaulting to no item fetch: ${String(error)}`);
    return { need_item: false, reason: "decision_parse_failed" };
  }
};

const summarizeItemPayload = (item: MercadoLivreItemPayload): string => {
  const preferredKeys = [
    "id",
    "title",
    "subtitle",
    "permalink",
    "status",
    "condition",
    "category_id",
    "price",
    "currency_id",
    "available_quantity",
    "sold_quantity",
    "warranty",
    "shipping",
    "seller_address",
    "attributes",
    "pictures",
    "descriptions"
  ];

  const lines: string[] = [];

  for (const key of preferredKeys) {
    if (!(key in item)) {
      continue;
    }

    const value = item[key];
    if (value === undefined || value === null) {
      continue;
    }

    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      lines.push(`- ${key}: ${String(value)}`);
      continue;
    }

    const compact = JSON.stringify(value);
    const maxLen = 1200;
    lines.push(`- ${key}: ${compact.length > maxLen ? `${compact.slice(0, maxLen)}…` : compact}`);
  }

  // If none of the preferred keys matched, fall back to a compact dump of top-level keys.
  if (lines.length === 0) {
    const keys = Object.keys(item).slice(0, 40);
    lines.push(`- keys: ${keys.join(", ")}`);
  }

  return lines.join("\n").slice(0, 8000);
};

const draftAnswer = async (question: MercadoLivreQuestion, rules: string): Promise<DraftedAnswer & DraftAnswerMeta> => {
  const decision = await decideNeedItemContext(question);

  let itemContext: string | undefined;
  let used_item_context = false;
  let item_context_error: string | undefined;

  if (decision.need_item) {
    try {
      const item = await fetch_ml_item.invoke({ item_id: question.item_id });
      itemContext = summarizeItemPayload(item);
      used_item_context = true;
    } catch (error) {
      item_context_error = error instanceof Error ? error.message : String(error);
      console.warn(`[agent_questions] item fetch failed for ${question.item_id}: ${item_context_error}`);
    }
  }

  const model = getChatModel(0.4);

  const prompt = buildPrompt(rules, question, itemContext);
  const result = await model.invoke(prompt);
  const content = typeof result.content === "string" ? result.content : JSON.stringify(result.content);

  return {
    question,
    answer: content.trim(),
    used_item_context,
    item_context_error
  };
};

const loadPreparedQuestionsFromFile = async (payloadPath: string): Promise<PreparedQuestionsPayload> => {
  const raw = await readFile(payloadPath, "utf8");
  const json: unknown = JSON.parse(raw);
  return PreparedQuestionsPayloadSchema.parse(json);
};

const resolvePreparedPayload = async (
  options: RunAgentQuestionsOptions
): Promise<{ prepared: PreparedQuestionsPayload; source: "inline_payload" | "file"; source_path?: string }> => {
  if (options.prepared) {
    return {
      prepared: PreparedQuestionsPayloadSchema.parse(options.prepared),
      source: "inline_payload"
    };
  }

  const payloadPath =
    options.payloadPath ?? path.join(__dirname, "../agent_retriever/outputs/unanswered-questions.json");

  const prepared = await loadPreparedQuestionsFromFile(payloadPath);
  return { prepared, source: "file", source_path: payloadPath };
};

const loadAnswersHistory = async (historyPath: string): Promise<AnswersHistory> => {
  try {
    const raw = await readFile(historyPath, "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "runs" in parsed &&
      Array.isArray((parsed as { runs?: unknown }).runs)
    ) {
      return parsed as AnswersHistory;
    }
    return { runs: [] };
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      return { runs: [] };
    }
    throw error;
  }
};

const persistRunLog = async (runLog: AnswersRunLog, persist: boolean): Promise<AgentQuestionsCompletedResult> => {
  if (!persist) {
    return { mode: "completed", run: runLog, persisted: false };
  }

  const outDir = path.join(__dirname, "outputs");
  await mkdir(outDir, { recursive: true });

  const latestPath = path.join(outDir, "answers-created.json");
  await writeFile(latestPath, JSON.stringify(runLog, null, 2), "utf8");
  console.log(`[agent_questions] wrote tracking file ${latestPath}`);

  const historyPath = path.join(outDir, "answers-history.json");
  const history = await loadAnswersHistory(historyPath);
  history.runs.push(runLog);
  await writeFile(historyPath, JSON.stringify(history, null, 2), "utf8");
  console.log(`[agent_questions] updated tracking history ${historyPath}`);

  return { mode: "completed", run: runLog, persisted: true };
};

/**
 * Runs the questions agent and returns structured output (for HTTP APIs and programmatic use).
 * The CLI wrapper {@link runAgentQuestions} logs to stdout and delegates here.
 */
export const runAgentQuestionsWithResult = async (
  options: RunAgentQuestionsOptions = {}
): Promise<AgentQuestionsRunResult> => {
  const rulesPath = path.join(__dirname, "RULES.md");
  const rules = await readFile(rulesPath, "utf8");

  const { prepared, source, source_path } = await resolvePreparedPayload(options);
  const payloadPathForLog = source === "file" ? (source_path ?? "file") : "inline_payload";

  const unanswered = prepared.questions.filter((q) => q.status === "UNANSWERED");
  const selected = typeof options.limit === "number" ? unanswered.slice(0, options.limit) : unanswered;

  if (options.dryRun) {
    const dry: AgentQuestionsDryRunResult = {
      mode: "dry_run",
      source,
      ...(source === "file" && source_path ? { source_path } : {}),
      total_unanswered: unanswered.length,
      would_process: selected.length,
      questions: selected.map((q) => ({
        id: q.id,
        item_id: q.item_id,
        status: q.status,
        text_preview: (q.text ?? "").slice(0, 160)
      }))
    };
    return dry;
  }

  const draftedAnswers: Array<DraftedAnswer & DraftAnswerMeta> = [];

  for (const question of selected) {
    const drafted = await draftAnswer(question, rules);
    draftedAnswers.push(drafted);
    console.log(
      `[agent_questions] drafted answer for question ${question.id} (item_context=${drafted.used_item_context ? "yes" : "no"})`
    );
  }

  const runLog: AnswersRunLog = {
    run_at: new Date().toISOString(),
    source_payload_path: payloadPathForLog,
    total_answers: draftedAnswers.length,
    answers: draftedAnswers.map(({ question, answer, used_item_context, item_context_error }) => ({
      question_id: question.id,
      item_id: question.item_id,
      status: question.status,
      question_text: question.text,
      used_item_context,
      ...(item_context_error ? { item_context_error } : {}),
      answer
    }))
  };

  const persist = options.persist !== false;
  return persistRunLog(runLog, persist);
};

export const runAgentQuestions = async (options: RunAgentQuestionsOptions = {}): Promise<void> => {
  const result = await runAgentQuestionsWithResult(options);

  if (result.mode === "dry_run") {
    const label = result.source === "file" ? result.source_path ?? "file" : "inline payload";
    console.log(`[agent_questions] dry-run: would draft ${result.would_process} answers from ${label}`);
    console.log(result.questions.map((q) => `- ${q.id} (${q.item_id}) ${q.text_preview}`).join("\n"));
    return;
  }

  console.log(
    `[agent_questions] completed run with ${result.run.total_answers} answers (persisted=${result.persisted ? "yes" : "no"})`
  );
};
