// SPDX-License-Identifier: MIT
// Copyright (c) 2026 AgentOPsBase contributors
//
// Part of AgentOPsBase. You may use, modify, redistribute, and sell this work
// or derivatives (including commercially) without owing the copyright holders
// anything beyond what the MIT license requires. This file is licensed under
// the terms in the LICENSE file at the repository root. The software is
// provided "AS IS", without warranty; the copyright holders are not liable for
// this code or for what anyone does with it.
import { END, START, Annotation, StateGraph, type LangGraphRunnableConfig } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { runAgentRetrieverWithResult } from "../agent_retriever/agent.js";
import { runAgentQuestionsWithResult } from "../agent_questions/agent.js";
import type { AgentQuestionsRunResult } from "../agent_questions/agent.js";
import { runAgentDealsWithResult } from "../agent_deals/agent.js";
import type { AgentDealsRunMetrics, AgentDealsRunResult } from "../agent_deals/agent.js";
import { formatUnknownErrorForLog } from "../agent_deals/diagnostics.js";
import { fetch_ml_sku_by_anuncio_id } from "../agent_deals/tools/context_item_sku.js";
import { env } from "../config/env.js";
import { getVectorStore } from "../lib/vector-store.js";
import { getAgentGraphLogger } from "./graph-logger-context.js";
import {
  OrchestrationDecisionSchema,
  type OrchestrationDecision,
  extractMercadoLivreItemIdFromText,
  inferRouteFromHeuristics,
  ORCHESTRATOR_HELP_TEXT
} from "./orchestration-schema.js";

/** Max times the orchestrator may run (each run picks at most one tool, then replans). */
const MAX_ORCHESTRATOR_INVOCATIONS = 12;

const ORCHESTRATOR_SYSTEM = [
  "You are the orquestrador (orchestrator) for the ml_agents project in a **multi-step loop**.",
  "You will see the user's original message, how many planner cycles have run, and an execution trace of completed tools.",
  "Each turn you choose **exactly one** `route` for the **next** action, or `done` when the user's goal is satisfied.",
  "",
  "Routes:",
  "- agent_retriever: Fetch UNANSWERED Mercado Livre buyer questions and write unanswered-questions.json.",
  "- agent_questions: Draft seller replies from unanswered-questions.json (requires OPENAI_API_KEY).",
  "- agent_deals: For Mercado Livre **campaigns / promotions**, including **finding which promotions include a given seller/internal SKU** (tool `find_promotions_for_seller_sku`), or listing campaigns, details, items, per-item state, candidate — via seller-promotion + items APIs. The deals agent uses tools and your message; result is written to seller-promotions.json.",
  "- fetch_item_sku: Look up seller SKU(s) for one listing (anúncio) by item id (MLB…/MLA…) via the proxy items API. Set `anuncio_id` when the id is explicit; otherwise it can be inferred from the message or from item lines in the trace (e.g. question lines with item_id).",
  "- vector_search: Semantic search over the MongoDB Atlas vector index.",
  "- help: One-shot explanation of capabilities (only when trace is still empty and the user asks what you can do).",
  "- done: Stop the loop — use after questions ran successfully, after vector_search, after agent_deals, after fetch_item_sku when that was the goal, when nothing else is needed, or when stuck.",
  "",
  "Chain-of-thought:",
  "- Fill `thought` with a brief reasoning (what you inferred, what is missing, what should run next).",
  "- Keep `reason` as a short machine-facing summary.",
  "",
  "Rules:",
  "- If the user wants **both** fresh questions **and** drafted answers, first run agent_retriever (if not yet successful in trace), then agent_questions once you see `[agent_retriever] ok` in trace.",
  "- Never pick agent_questions before a successful retriever run **unless** the trace already shows `[agent_retriever] ok` from this session.",
  "- After `[agent_questions] ok` or questions dry_run in trace, choose **done**.",
  "- If trace shows `[agent_retriever] dry_run`, choose **done** (nothing was written for questions to consume).",
  "- If the user only wanted vector search and trace shows vector results, choose **done**.",
  "- If the user asked for **promotions/deals/campaigns** to join, or **which promotions include SKU X** / \"promoções com o código …\", use **agent_deals**; after `[agent_deals] ok` or dry_run in trace, choose **done**.",
  "- For agent_deals you may set `promotion_type` as a **hint** (e.g. filter list) or omit; the deals agent can call list, the SKU-matching tool, detail, items, or item-level promotion APIs as needed for the user message.",
  "- If the user asks for **SKU / seller code** for a **specific listing** (anúncio) by `ML*…` id, use **fetch_item_sku** with `anuncio_id` — not when they want **promotions filtered by SKU** (that is **agent_deals**). After `[fetch_item_sku] ok` or failed in trace, choose **done** unless they also asked for retriever/questions/deals in the same run and those are not finished yet.",
  "- Multi-step example: retriever → questions → **fetch_item_sku** when the user wants drafts **and** the SKU for a specific `anuncio_id` (set `anuncio_id` from their text).",
  "- Extract limit (1–25) or dry_run only when clearly requested.",
  "- For vector_search, you may set vector_k (1–20).",
  "- If unsure and trace is empty, prefer **help** over random tools."
].join("\n");

const buildOrchestratorUserMessage = (state: {
  input: string;
  trace: readonly string[];
  planner_depth: number;
}): string => {
  const traceBlock =
    state.trace.length > 0
      ? state.trace.map((line, i) => `${i + 1}. ${line}`).join("\n")
      : "(none yet)";

  return [
    "Original user request:",
    state.input,
    "",
    `Planner cycle (1-based next action): ${state.planner_depth + 1} (hard cap ${MAX_ORCHESTRATOR_INVOCATIONS} orchestrator turns).`,
    "",
    "Execution trace (chronological):",
    traceBlock
  ].join("\n");
};

const decideWithLlm = async (state: {
  input: string;
  trace: readonly string[];
  planner_depth: number;
}): Promise<OrchestrationDecision> => {
  if (state.planner_depth >= MAX_ORCHESTRATOR_INVOCATIONS) {
    return {
      route: "done",
      reason: `planner cap reached (${MAX_ORCHESTRATOR_INVOCATIONS} turns)`
    };
  }

  if (!env.OPENAI_API_KEY) {
    return inferRouteFromHeuristics(state.input, state.trace);
  }

  const model = new ChatOpenAI({
    apiKey: env.OPENAI_API_KEY,
    model: "gpt-4o-mini",
    temperature: 0
  }).withStructuredOutput(OrchestrationDecisionSchema, { includeRaw: true });

  try {
    const res = await model.invoke([
      { role: "system", content: ORCHESTRATOR_SYSTEM },
      { role: "user", content: buildOrchestratorUserMessage(state) }
    ]);
    const parsed = (res as { parsed: unknown }).parsed;
    return OrchestrationDecisionSchema.parse(parsed);
  } catch {
    return inferRouteFromHeuristics(state.input, state.trace);
  }
};

const formatDealsRunMetrics = (m: AgentDealsRunMetrics | undefined): string => {
  if (!m) {
    return "";
  }
  const t = m.llm_tokens;
  if (t.interactions > 0) {
    return `\nmetrics: ${m.duration_ms}ms | LLM prompt=${t.prompt} completion=${t.completion} total=${t.total} (${t.interactions} invoke(s))`;
  }
  return `\nmetrics: ${m.duration_ms}ms | no LLM`;
};

const formatDealsRun = (result: AgentDealsRunResult): string => {
  if (result.mode === "dry_run") {
    const lines = result.sample.map(
      (p) => `- ${p.id} (${p.type}) ${p.status}${p.name ? ` — ${p.name}` : ""}`
    );
    return [
      `[agent_deals] dry_run: would list ${result.would_list} row(s) filter=${result.promotion_type_filter ?? "none"}`,
      ...lines,
      formatDealsRunMetrics(result.run_metrics)
    ].join("\n");
  }
  const { response, artifacts, output_path } = result;
  if (artifacts.mode === "llm_tools") {
    const toolNames = artifacts.tool_trace.map((t) => t.name).join(", ");
    const listHead =
      response.results.length > 0
        ? [
            `list snapshot: ${response.results.length} invitation(s)`,
            ...response.results.slice(0, 12).map(
              (p) =>
                `- ${p.id} type=${p.type} status=${p.status}` +
                (typeof p.name === "string" ? ` name=${p.name}` : "")
            )
          ].join("\n")
        : "list tool not used or no rows returned.";
    return [
      "[agent_deals] (tool-calling)",
      `tools called: ${toolNames || "(none)"}`,
      "",
      "Assistant:",
      artifacts.final_assistant_text.slice(0, 6_000),
      "",
      listHead,
      "",
      `written: ${output_path}`,
      formatDealsRunMetrics(result.run_metrics)
    ].join("\n");
  }
  const head = `${response.results.length} promotion(s)`;
  const lines = response.results.map(
    (p) =>
      `- ${p.id} type=${p.type} status=${p.status}` +
      (typeof p.name === "string" ? ` name=${p.name}` : "")
  );
  return [head, ...lines, `written: ${output_path}`, formatDealsRunMetrics(result.run_metrics)].join("\n");
};

const resolveAnuncioIdForSkuFetch = (
  orchestration: OrchestrationDecision,
  input: string,
  trace: readonly string[]
): string | undefined => {
  const fromDecision = orchestration.anuncio_id?.trim();
  if (fromDecision) {
    return fromDecision;
  }
  return (
    extractMercadoLivreItemIdFromText(input) ?? extractMercadoLivreItemIdFromText(trace.join("\n"))
  );
};

const formatQuestionsRun = (result: AgentQuestionsRunResult): string => {
  if (result.mode === "dry_run") {
    const lines = result.questions.map((q) => `- ${q.id} (${q.item_id}) ${q.text_preview}`);
    return [
      `[agent_questions] dry_run: would process ${result.would_process} of ${result.total_unanswered} unanswered (source=${result.source}).`,
      ...lines
    ].join("\n");
  }

  return [
    `[agent_questions] completed: ${result.run.total_answers} answer(s) drafted.`,
    `Source: ${result.run.source_payload_path}`,
    `Persisted: ${result.persisted ? "yes" : "no"}`
  ].join("\n");
};

const GraphState = Annotation.Root({
  input: Annotation<string>({
    reducer: (_prev, next) => next,
    default: () => ""
  }),
  /** Monotonic planner invocations (incremented each time `orquestrador` runs). */
  planner_depth: Annotation<number>({
    reducer: (_prev, next) => next,
    default: () => 0
  }),
  /** One line per completed tool / milestone for replanning. */
  trace: Annotation<string[]>({
    reducer: (prev, next) => [...prev, ...next],
    default: () => []
  }),
  orchestration: Annotation<OrchestrationDecision>({
    reducer: (_prev, next) => next,
    default: () => ({ route: "help", reason: "pending" })
  }),
  output: Annotation<string>({
    reducer: (prev, next) => {
      if (!next) {
        return prev;
      }
      if (!prev) {
        return next;
      }
      return `${prev}\n\n---\n\n${next}`;
    },
    default: () => ""
  })
});

const orquestrador = async (
  state: typeof GraphState.State,
  config?: LangGraphRunnableConfig
): Promise<Partial<typeof GraphState.State>> => {
  const log = getAgentGraphLogger(config);

  if (state.planner_depth >= MAX_ORCHESTRATOR_INVOCATIONS) {
    const forced: OrchestrationDecision = {
      route: "done",
      reason: `Stopped: max orchestrator invocations (${MAX_ORCHESTRATOR_INVOCATIONS})`
    };
    return {
      orchestration: forced,
      planner_depth: state.planner_depth + 1,
      trace: ["[orquestrador] forced route=done (max planner invocations)"],
      output: `[orquestrador] ${forced.reason}`
    };
  }

  const run = (): Promise<OrchestrationDecision> =>
    decideWithLlm({
      input: state.input,
      trace: state.trace,
      planner_depth: state.planner_depth
    });

  const orchestration = log
    ? await log.withStep(
        "graph_node_orquestrador",
        run,
        {
          input_length: state.input.length,
          planner_depth: state.planner_depth,
          trace_lines: state.trace.length
        }
      )
    : await run();

  const nextDepth = state.planner_depth + 1;
  const thoughtSnip = orchestration.thought?.replace(/\s+/g, " ").trim().slice(0, 280);
  const traceLine = `[orquestrador] route=${orchestration.route}${thoughtSnip ? ` thought=${thoughtSnip}` : ""}`;

  return {
    orchestration,
    planner_depth: nextDepth,
    trace: [traceLine]
  };
};

const nodeHelp = async (
  state: typeof GraphState.State,
  config?: LangGraphRunnableConfig
): Promise<Partial<typeof GraphState.State>> => {
  const log = getAgentGraphLogger(config);
  const work = async (): Promise<Partial<typeof GraphState.State>> => {
    const header = [
      `Orquestrador: ${state.orchestration.reason}`,
      "",
      ORCHESTRATOR_HELP_TEXT
    ].join("\n");
    return {
      output: header,
      trace: ["[help] capabilities shown"]
    };
  };
  return log ? log.withStep("graph_node_help", work, {}) : work();
};

const nodeRetriever = async (
  state: typeof GraphState.State,
  config?: LangGraphRunnableConfig
): Promise<Partial<typeof GraphState.State>> => {
  const log = getAgentGraphLogger(config);
  const { limit, dry_run } = state.orchestration;

  const work = async (): Promise<Partial<typeof GraphState.State>> => {
    try {
      const result = await runAgentRetrieverWithResult({
        limit,
        dryRun: Boolean(dry_run)
      });

      if (result.mode === "dry_run") {
        const lines = result.questions.map((q) => `- ${q.id} (${q.item_id}) ${q.text_preview.slice(0, 80)}`);
        return {
          output: [`[agent_retriever] dry_run (${state.orchestration.reason})`, ...lines].join("\n"),
          trace: [`[agent_retriever] dry_run would_process=${result.would_process}`]
        };
      }

      return {
        output: `[agent_retriever] wrote ${result.question_count} question(s) to ${result.output_path}\n(${state.orchestration.reason})`,
        trace: [`[agent_retriever] ok wrote=${result.question_count} path=${result.output_path}`]
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return {
        output: `[agent_retriever] failed: ${msg}`,
        trace: [`[agent_retriever] failed ${msg.slice(0, 200)}`]
      };
    }
  };

  return log
    ? log.withStep("graph_node_agent_retriever", work, {
        limit: limit ?? null,
        dry_run: Boolean(dry_run)
      })
    : work();
};

const nodeQuestions = async (
  state: typeof GraphState.State,
  config?: LangGraphRunnableConfig
): Promise<Partial<typeof GraphState.State>> => {
  const log = getAgentGraphLogger(config);
  const { limit, dry_run } = state.orchestration;

  const work = async (): Promise<Partial<typeof GraphState.State>> => {
    try {
      const result = await runAgentQuestionsWithResult({
        limit,
        dryRun: Boolean(dry_run),
        includeItemSkuInListingContext: true
      });
      const body = `${formatQuestionsRun(result)}\n(${state.orchestration.reason})`;
      const traceLine =
        result.mode === "dry_run"
          ? `[agent_questions] dry_run would=${result.would_process}`
          : `[agent_questions] ok answers=${result.run.total_answers}`;
      return { output: body, trace: [traceLine] };
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      const hint =
        code === "ENOENT"
          ? " Tip: run agent_retriever first to create unanswered-questions.json."
          : "";
      const msg = error instanceof Error ? error.message : String(error);
      return {
        output: `[agent_questions] failed: ${msg}${hint}`,
        trace: [`[agent_questions] failed ${msg.slice(0, 200)}`]
      };
    }
  };

  return log
    ? log.withStep("graph_node_agent_questions", work, {
        limit: limit ?? null,
        dry_run: Boolean(dry_run)
      })
    : work();
};

const nodeDeals = async (
  state: typeof GraphState.State,
  config?: LangGraphRunnableConfig
): Promise<Partial<typeof GraphState.State>> => {
  const log = getAgentGraphLogger(config);
  const { dry_run, promotion_type } = state.orchestration;

  const work = async (): Promise<Partial<typeof GraphState.State>> => {
    try {
      const result = await runAgentDealsWithResult({
        promotionType: promotion_type,
        dryRun: Boolean(dry_run),
        userMessage: state.input
      });
      const body = `${formatDealsRun(result)}\n(${state.orchestration.reason})`;
      const traceLine =
        result.mode === "dry_run"
          ? `[agent_deals] dry_run would_list=${result.would_list}`
          : result.artifacts.mode === "llm_tools"
            ? `[agent_deals] ok tools=${result.artifacts.tool_trace.length} list_rows=${result.response.results.length} path=${result.output_path}`
            : `[agent_deals] ok count=${result.response.results.length} path=${result.output_path}`;
      return { output: body, trace: [traceLine] };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      const diagnostic = formatUnknownErrorForLog(error);
      console.error("[agent_deals] graph node error", {
        message: msg,
        diagnostic,
        ...(error instanceof Error && error.stack ? { stack: error.stack } : {})
      });
      return {
        output: `[agent_deals] failed: ${msg}`,
        trace: [`[agent_deals] failed ${msg.slice(0, 400)}`]
      };
    }
  };

  return log
    ? log.withStep("graph_node_agent_deals", work, {
        promotion_type: promotion_type ?? null,
        dry_run: Boolean(dry_run)
      })
    : work();
};

const nodeVectorSearch = async (
  state: typeof GraphState.State,
  config?: LangGraphRunnableConfig
): Promise<Partial<typeof GraphState.State>> => {
  const log = getAgentGraphLogger(config);
  const k = state.orchestration.vector_k ?? 5;

  const work = async (): Promise<Partial<typeof GraphState.State>> => {
    try {
      const store = await getVectorStore();
      const docs = await store.similaritySearch(state.input, k);
      const lines = docs.map(
        (d, i) => `${i + 1}. score/metadata: ${JSON.stringify(d.metadata ?? {})}\n   ${String(d.pageContent).slice(0, 400)}`
      );
      const out =
        lines.length > 0
          ? [`[vector_search] top ${docs.length} (${state.orchestration.reason})`, ...lines].join("\n\n")
          : `[vector_search] no documents returned (k=${k}).`;
      return {
        output: out,
        trace: [`[vector_search] ok hits=${docs.length}`]
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return {
        output: `[vector_search] failed: ${msg}`,
        trace: [`[vector_search] failed ${msg.slice(0, 200)}`]
      };
    }
  };

  return log ? log.withStep("graph_node_vector_search", work, { k }) : work();
};

const nodeFetchItemSku = async (
  state: typeof GraphState.State,
  config?: LangGraphRunnableConfig
): Promise<Partial<typeof GraphState.State>> => {
  const log = getAgentGraphLogger(config);

  const work = async (): Promise<Partial<typeof GraphState.State>> => {
    const anuncio_id = resolveAnuncioIdForSkuFetch(state.orchestration, state.input, state.trace);
    if (!anuncio_id) {
      return {
        output: [
          "[fetch_item_sku] failed: could not resolve anuncio_id.",
          "Include a Mercado Livre listing id (e.g. MLB1234567890) in the request, or set `anuncio_id` in the plan when item context is only implicit."
        ].join(" "),
        trace: ["[fetch_item_sku] failed missing anuncio_id"]
      };
    }

    try {
      const result = await fetch_ml_sku_by_anuncio_id.invoke({ anuncio_id });
      const detail = result.sku_not_found
        ? "no seller SKU on item payload (sku_not_found)"
        : `skus: ${result.skus.join(", ")}`;
      const body = [
        `[fetch_item_sku] anuncio_id=${result.anuncio_id} item_id=${result.item_id} ${detail}`,
        `(${state.orchestration.reason})`
      ].join("\n");
      const traceLine = result.sku_not_found
        ? `[fetch_item_sku] ok anuncio_id=${anuncio_id} sku_not_found`
        : `[fetch_item_sku] ok anuncio_id=${anuncio_id} skus=${result.skus.join("|")}`;
      return { output: body, trace: [traceLine] };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return {
        output: `[fetch_item_sku] failed: ${msg}\n(${state.orchestration.reason})`,
        trace: [`[fetch_item_sku] failed ${msg.slice(0, 240)}`]
      };
    }
  };

  const meta = {
    anuncio_id:
      resolveAnuncioIdForSkuFetch(state.orchestration, state.input, state.trace) ?? null
  };
  return log ? log.withStep("graph_node_fetch_item_sku", work, meta) : work();
};

const routeAfterOrchestrator = (state: typeof GraphState.State): OrchestrationDecision["route"] =>
  state.orchestration.route;

const graphBuilder = new StateGraph(GraphState)
  .addNode("orquestrador", orquestrador)
  .addNode("help", nodeHelp)
  .addNode("agent_retriever", nodeRetriever)
  .addNode("agent_questions", nodeQuestions)
  .addNode("vector_search", nodeVectorSearch)
  .addNode("agent_deals", nodeDeals)
  .addNode("fetch_item_sku", nodeFetchItemSku)
  .addEdge(START, "orquestrador")
  .addConditionalEdges("orquestrador", routeAfterOrchestrator, {
    help: "help",
    agent_retriever: "agent_retriever",
    agent_questions: "agent_questions",
    agent_deals: "agent_deals",
    fetch_item_sku: "fetch_item_sku",
    vector_search: "vector_search",
    done: END
  })
  .addEdge("help", END)
  .addEdge("agent_retriever", "orquestrador")
  .addEdge("agent_questions", "orquestrador")
  .addEdge("agent_deals", "orquestrador")
  .addEdge("fetch_item_sku", "orquestrador")
  .addEdge("vector_search", "orquestrador");

export const agentGraph = graphBuilder.compile();
