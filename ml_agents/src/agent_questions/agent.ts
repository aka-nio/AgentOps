import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import { type MercadoLivreItemPayload, type MercadoLivreQuestion } from "../agent_retriever/types.js";
import { extractSkusFromMlItemPayload } from "../agent_deals/tools/context_item_sku.js";
import { env } from "../config/env.js";
import { fetch_ml_item } from "../agent_retriever/tools/items.js";
import { getAgentRunLogger, withAgentRunLog } from "../lib/agent-run-log.js";
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

const buildPrompt = (
  rules: string,
  question: MercadoLivreQuestion,
  itemContext?: string,
  itemSku = ""
): string => {
  return [
    "You are agent_questions.",
    "",
    "Follow these rules:",
    rules.trim(),
    "",
    "Task:",
    "Draft a suggested seller reply to the Mercado Livre customer question below.",
    "Return ONLY the final answer text (no headings, no markdown fences).",
    'If this should be handled by a human agent, return EXACTLY "__HUMAN_AGENT__" and nothing else.',
    "",
    itemContext
      ? [
          "Listing context (from our proxy; may be partial):",
          itemContext,
          "",
          "Use ONLY facts supported by the listing context above. If something is not present, do not invent it.",
          'If the customer asks for specific details that are NOT present in listing context, return "__HUMAN_AGENT__".'
        ].join("\n")
      : "",
    "",
    "Question:",
    `- id: ${question.id}`,
    `- item_id: ${question.item_id}`,
    `- sku: ${itemSku}`,
    `- status: ${question.status}`,
    `- text: ${question.text || "(empty)"}`,
    `- date_created: ${question.date_created}`
  ].join("\n");
};

const FREIGHT_QUESTION_RE =
  /\b(frete|envio|entrega|shipping|prazo de entrega|tempo de entrega|valor do frete|custo do frete)\b/i;
const MORE_UNITS_QUESTION_RE =
  /\b(mais unidades?|mais pecas?|mais peças?|quantidade|atacado|lote|kit com|tem mais|consegue mais|maior quantidade)\b/i;
const SPECIFIC_INFO_QUESTION_RE =
  /\b(dimens(?:ao|ão|oes|ões)|medida|tamanho|peso|material|voltagem|amperagem|potencia|potência|compat[ií]vel|modelo|sku|garantia|desempenho|especifica[cç][aã]o|detalhe t[ée]cnico)\b/i;

const toHumanHandoff = (
  question: MercadoLivreQuestion,
  reason: string,
  used_item_context = false,
  item_context_error?: string,
  sku = ""
): DraftedAnswer & DraftAnswerMeta => ({
  question,
  answer: "",
  used_item_context,
  sku,
  ...(item_context_error ? { item_context_error } : {}),
  handoff_reason: reason
});

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

  const log = getAgentRunLogger();
  const msg = log
    ? await log.withLlmStep("openai_item_context_decision", () => model.invoke(prompt), { questionId: question.id })
    : await model.invoke(prompt);
  const raw = typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content);

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

const buildListingContextForPrompt = (
  item: MercadoLivreItemPayload,
  includeSku: boolean
): { listingContext: string; sku: string } => {
  const skus = extractSkusFromMlItemPayload(item as Record<string, unknown>);
  const sku = skus.length > 0 ? skus.join(", ") : "";
  const body = summarizeItemPayload(item);
  if (!includeSku) {
    return { listingContext: body, sku };
  }
  const skuBlock =
    skus.length > 0
      ? `Seller SKU(s) from this listing: ${skus.join(", ")}`
      : "Seller SKU(s) from this listing: (not present in item payload).";
  return {
    listingContext: [skuBlock, body].join("\n\n").slice(0, 8000),
    sku
  };
};

const draftAnswer = async (
  question: MercadoLivreQuestion,
  rules: string,
  itemContextOptions: { includeItemSkuInListingContext: boolean }
): Promise<DraftedAnswer & DraftAnswerMeta> => {
  const normalizedQuestionText = (question.text ?? "").trim();
  if (FREIGHT_QUESTION_RE.test(normalizedQuestionText)) {
    return toHumanHandoff(question, "freight_question_human_required");
  }

  const asksMoreUnits = MORE_UNITS_QUESTION_RE.test(normalizedQuestionText);
  const decision = await decideNeedItemContext(question);

  let itemContext: string | undefined;
  let used_item_context = false;
  let item_context_error: string | undefined;
  let handoff_reason: string | undefined;
  let resolved_sku = "";

  const shouldForceItemLookup = asksMoreUnits || SPECIFIC_INFO_QUESTION_RE.test(normalizedQuestionText);

  if (decision.need_item || shouldForceItemLookup) {
    try {
      const item = await fetch_ml_item.invoke({ item_id: question.item_id });
      const built = buildListingContextForPrompt(item, itemContextOptions.includeItemSkuInListingContext);
      itemContext = built.listingContext;
      resolved_sku = built.sku;
      used_item_context = true;
    } catch (error) {
      item_context_error = error instanceof Error ? error.message : String(error);
      console.warn(`[agent_questions] item fetch failed for ${question.item_id}: ${item_context_error}`);
      if (asksMoreUnits) {
        return toHumanHandoff(question, "more_units_item_not_found", false, item_context_error, "");
      }
      handoff_reason = "item_context_fetch_failed";
    }
  }

  if (!itemContext && shouldForceItemLookup && !asksMoreUnits) {
    return toHumanHandoff(question, handoff_reason ?? "specific_info_not_grounded_in_listing", false, item_context_error, "");
  }

  const model = getChatModel(0.4);

  const prompt = buildPrompt(rules, question, itemContext, resolved_sku);
  const log = getAgentRunLogger();
  const result = log
    ? await log.withLlmStep(
        "openai_draft_answer",
        () => model.invoke(prompt),
        {
          questionId: question.id,
          hasItemContext: Boolean(itemContext)
        }
      )
    : await model.invoke(prompt);
  const content = typeof result.content === "string" ? result.content : JSON.stringify(result.content);
  const answer = content.trim();
  if (answer === "__HUMAN_AGENT__") {
    return toHumanHandoff(
      question,
      asksMoreUnits ? "more_units_requires_human" : "missing_listing_information_requires_human",
      used_item_context,
      item_context_error,
      resolved_sku
    );
  }

  return {
    question,
    answer,
    used_item_context,
    sku: resolved_sku,
    item_context_error,
    ...(handoff_reason ? { handoff_reason } : {})
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

  const log = getAgentRunLogger();
  const writeOutputs = async (): Promise<void> => {
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
  };

  if (log) {
    await log.withStep("persist_answer_artifacts", writeOutputs, { answerCount: runLog.total_answers });
  } else {
    await writeOutputs();
  }

  return { mode: "completed", run: runLog, persisted: true };
};

/**
 * Runs the questions agent and returns structured output (for HTTP APIs and programmatic use).
 * The CLI wrapper {@link runAgentQuestions} logs to stdout and delegates here.
 */
export const runAgentQuestionsWithResult = async (
  options: RunAgentQuestionsOptions = {}
): Promise<AgentQuestionsRunResult> => {
  return withAgentRunLog(
    "agent_questions",
    {
      dryRun: Boolean(options.dryRun),
      persist: options.persist !== false,
      limit: options.limit ?? null,
      includeItemSkuInListingContext: options.includeItemSkuInListingContext !== false
    },
    async (log) => {
      const rulesPath = path.join(__dirname, "RULES.md");
      const rules = await log.withStep("load_rules_md", () => readFile(rulesPath, "utf8"));

      const { prepared, source, source_path } = await log.withStep("resolve_prepared_payload", () =>
        resolvePreparedPayload(options)
      );
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
      const itemSkuInContext = options.includeItemSkuInListingContext !== false;

      for (const question of selected) {
        const drafted = await log.withStep(
          "draft_answer_question",
          () => draftAnswer(question, rules, { includeItemSkuInListingContext: itemSkuInContext }),
          { questionId: question.id, itemId: question.item_id }
        );
        draftedAnswers.push(drafted);
        console.log(
          `[agent_questions] drafted answer for question ${question.id} (item_context=${drafted.used_item_context ? "yes" : "no"})`
        );
      }

      const runLog: AnswersRunLog = {
        run_at: new Date().toISOString(),
        source_payload_path: payloadPathForLog,
        total_answers: draftedAnswers.length,
        answers: draftedAnswers.map(
          ({ question, answer, used_item_context, sku, item_context_error, handoff_reason }) => ({
            question_id: question.id,
            item_id: question.item_id,
            sku,
            status: question.status,
            question_text: question.text,
            used_item_context,
            ...(item_context_error ? { item_context_error } : {}),
            ...(handoff_reason ? { handoff_reason } : {}),
            answer
          })
        )
      };

      const persist = options.persist !== false;
      return persistRunLog(runLog, persist);
    }
  );
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
