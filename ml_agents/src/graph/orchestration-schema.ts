import { z } from "zod";

export const OrchestrationRouteSchema = z.enum([
  "agent_retriever",
  "agent_questions",
  "vector_search",
  "help"
]);

export type OrchestrationRoute = z.infer<typeof OrchestrationRouteSchema>;

export const OrchestrationDecisionSchema = z.object({
  route: OrchestrationRouteSchema,
  /** Applies to retriever and questions agents when the user asks for a cap (e.g. "only 3"). */
  limit: z.number().int().positive().max(25).optional(),
  dry_run: z.boolean().optional(),
  /** For vector_search only. */
  vector_k: z.number().int().positive().max(20).optional(),
  reason: z.string().max(500)
});

export type OrchestrationDecision = z.infer<typeof OrchestrationDecisionSchema>;

const normalize = (s: string): string => s.toLowerCase();

/** Used when `OPENAI_API_KEY` is missing or the structured call fails. */
export const inferRouteFromHeuristics = (input: string): OrchestrationDecision => {
  const t = normalize(input);

  if (
    /\b(help|ajuda|o que você faz|what can you do|how does this work|capabilities)\b/i.test(input) ||
    t.trim().length < 4
  ) {
    return { route: "help", reason: "heuristic: help or very short message" };
  }

  if (
    /\b(vector|embedding|similarity|semant(ic|a)|busca vetorial)\b/i.test(t) ||
    /\b(find|encontre).{0,40}\b(in (the )?docs|na base|nos documentos)\b/i.test(t)
  ) {
    return { route: "vector_search", reason: "heuristic: vector / semantic search intent" };
  }

  if (
    /\b(retriev|buscar perguntas|unanswered|nao respondidas|não respondidas|preparar json|unanswered-questions)\b/i.test(
      t
    ) ||
    /\b(fetch|trazer|listar).{0,30}\b(questions|perguntas)\b/i.test(t)
  ) {
    return { route: "agent_retriever", reason: "heuristic: fetch / prepare unanswered questions" };
  }

  if (
    /\b(answer|responder|draft|rascunho|seller reply|resposta do vendedor|agent_questions|questions agent)\b/i.test(
      t
    )
  ) {
    return { route: "agent_questions", reason: "heuristic: draft answers to prepared questions" };
  }

  return {
    route: "help",
    reason: "heuristic: no strong match; defaulting to help so the user sees available operations"
  };
};

export const ORCHESTRATOR_HELP_TEXT = [
  "Operações disponíveis (use frases naturais em português ou inglês):",
  "",
  "1) agent_retriever — Busca perguntas não respondidas no Mercado Livre (via proxy) e grava `src/agent_retriever/outputs/unanswered-questions.json`.",
  "   Ex.: \"prepare unanswered questions\", \"buscar perguntas não respondidas\", \"rodar o retriever\".",
  "",
  "2) agent_questions — Lê o JSON preparado e gera rascunhos de resposta do vendedor (requer `OPENAI_API_KEY`).",
  "   Ex.: \"draft answers\", \"responder perguntas\", \"rodar agent questions\". Se o JSON ainda não existir, rode o retriever antes.",
  "",
  "3) vector_search — Busca semântica nos embeddings MongoDB Atlas (requer `OPENAI_API_KEY` e índice vetorial configurado).",
  "   Ex.: \"vector search for shipping policy\", \"busca semântica sobre garantia\".",
  "",
  "4) help — Esta mensagem.",
  "",
  "Fluxo típico: retriever → questions. Você pode pedir tudo em uma única mensagem ao orquestrador; ele escolhe o próximo passo com base no contexto."
].join("\n");
