import { END, START, Annotation, StateGraph } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { runAgentRetrieverWithResult } from "../agent_retriever/agent.js";
import { runAgentQuestionsWithResult } from "../agent_questions/agent.js";
import type { AgentQuestionsRunResult } from "../agent_questions/agent.js";
import { env } from "../config/env.js";
import { getVectorStore } from "../lib/vector-store.js";
import {
  OrchestrationDecisionSchema,
  type OrchestrationDecision,
  inferRouteFromHeuristics,
  ORCHESTRATOR_HELP_TEXT
} from "./orchestration-schema.js";

const ORCHESTRATOR_SYSTEM = [
  "You are the orquestrador (orchestrator) for the ml_agents project.",
  "Given the user's message, choose exactly one route and optional parameters.",
  "",
  "Routes:",
  "- agent_retriever: User wants to fetch UNANSWERED Mercado Livre buyer questions from the API (via RETRIEVER_PROXY_ML_URL) and write/update unanswered-questions.json.",
  "- agent_questions: User wants draft seller replies for questions already in unanswered-questions.json (needs OPENAI_API_KEY for LLM).",
  "- vector_search: User wants semantic / similarity search over the MongoDB Atlas vector index (needs OPENAI_API_KEY and configured Mongo vector index).",
  "- help: User greets, asks what you can do, or intent is unclear — no side-effect tools.",
  "",
  "Rules:",
  "- If the user asks how the system works or lists capabilities, use help.",
  "- If they want answers but mention no prepared file, still choose agent_questions when clearly about drafting replies; the worker will explain if the file is missing.",
  "- Extract limit (1–25) or dry_run only when the user clearly asks (e.g. \"dry run\", \"apenas 5\").",
  "- For vector_search, you may set vector_k (1–20) if they ask for more/fewer hits.",
  "- Always set reason to a short internal justification (one sentence)."
].join("\n");

const decideWithLlm = async (userInput: string): Promise<OrchestrationDecision> => {
  if (!env.OPENAI_API_KEY) {
    return inferRouteFromHeuristics(userInput);
  }

  const model = new ChatOpenAI({
    apiKey: env.OPENAI_API_KEY,
    model: "gpt-4o-mini",
    temperature: 0
  }).withStructuredOutput(OrchestrationDecisionSchema);

  try {
    const raw = await model.invoke([
      { role: "system", content: ORCHESTRATOR_SYSTEM },
      { role: "user", content: userInput }
    ]);
    return OrchestrationDecisionSchema.parse(raw);
  } catch {
    return inferRouteFromHeuristics(userInput);
  }
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
  orchestration: Annotation<OrchestrationDecision>({
    reducer: (_prev, next) => next,
    default: () => ({ route: "help", reason: "pending" })
  }),
  output: Annotation<string>({
    reducer: (_prev, next) => next,
    default: () => ""
  })
});

const orquestrador = async (state: typeof GraphState.State): Promise<Partial<typeof GraphState.State>> => {
  const orchestration = await decideWithLlm(state.input);
  return { orchestration };
};

const nodeHelp = async (state: typeof GraphState.State): Promise<Partial<typeof GraphState.State>> => {
  const header = [
    `Orquestrador: ${state.orchestration.reason}`,
    "",
    ORCHESTRATOR_HELP_TEXT
  ].join("\n");
  return { output: header };
};

const nodeRetriever = async (state: typeof GraphState.State): Promise<Partial<typeof GraphState.State>> => {
  const { limit, dry_run } = state.orchestration;
  try {
    const result = await runAgentRetrieverWithResult({
      limit,
      dryRun: Boolean(dry_run)
    });

    if (result.mode === "dry_run") {
      const lines = result.questions.map((q) => `- ${q.id} (${q.item_id}) ${q.text_preview.slice(0, 80)}`);
      return {
        output: [`[agent_retriever] dry_run (${state.orchestration.reason})`, ...lines].join("\n")
      };
    }

    return {
      output: `[agent_retriever] wrote ${result.question_count} question(s) to ${result.output_path}\n(${state.orchestration.reason})`
    };
  } catch (error) {
    return {
      output: `[agent_retriever] failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
};

const nodeQuestions = async (state: typeof GraphState.State): Promise<Partial<typeof GraphState.State>> => {
  const { limit, dry_run } = state.orchestration;
  try {
    const result = await runAgentQuestionsWithResult({
      limit,
      dryRun: Boolean(dry_run)
    });
    return { output: `${formatQuestionsRun(result)}\n(${state.orchestration.reason})` };
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    const hint =
      code === "ENOENT"
        ? " Tip: run agent_retriever first to create unanswered-questions.json."
        : "";
    return {
      output: `[agent_questions] failed: ${error instanceof Error ? error.message : String(error)}${hint}`
    };
  }
};

const nodeVectorSearch = async (state: typeof GraphState.State): Promise<Partial<typeof GraphState.State>> => {
  const k = state.orchestration.vector_k ?? 5;
  try {
    const store = await getVectorStore();
    const docs = await store.similaritySearch(state.input, k);
    const lines = docs.map((d, i) => `${i + 1}. score/metadata: ${JSON.stringify(d.metadata ?? {})}\n   ${String(d.pageContent).slice(0, 400)}`);
    return {
      output:
        lines.length > 0
          ? [`[vector_search] top ${docs.length} (${state.orchestration.reason})`, ...lines].join("\n\n")
          : `[vector_search] no documents returned (k=${k}).`
    };
  } catch (error) {
    return {
      output: `[vector_search] failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
};

const routeAfterOrchestrator = (state: typeof GraphState.State): OrchestrationDecision["route"] =>
  state.orchestration.route;

const graphBuilder = new StateGraph(GraphState)
  .addNode("orquestrador", orquestrador)
  .addNode("help", nodeHelp)
  .addNode("agent_retriever", nodeRetriever)
  .addNode("agent_questions", nodeQuestions)
  .addNode("vector_search", nodeVectorSearch)
  .addEdge(START, "orquestrador")
  .addConditionalEdges("orquestrador", routeAfterOrchestrator, {
    help: "help",
    agent_retriever: "agent_retriever",
    agent_questions: "agent_questions",
    vector_search: "vector_search"
  })
  .addEdge("help", END)
  .addEdge("agent_retriever", END)
  .addEdge("agent_questions", END)
  .addEdge("vector_search", END);

export const agentGraph = graphBuilder.compile();
