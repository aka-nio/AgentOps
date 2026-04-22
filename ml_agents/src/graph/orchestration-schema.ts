import { z } from "zod";

export const OrchestrationRouteSchema = z.enum([
  "agent_retriever",
  "agent_questions",
  "agent_deals",
  /** Resolve seller SKU(s) for a listing id (anúncio) via the proxy items API. */
  "fetch_item_sku",
  "vector_search",
  "help",
  /** Goal satisfied or no further tool step; graph ends. */
  "done"
]);

export type OrchestrationRoute = z.infer<typeof OrchestrationRouteSchema>;

export const OrchestrationDecisionSchema = z.object({
  route: OrchestrationRouteSchema,
  /** Applies to retriever and questions agents when the user asks for a cap (e.g. "only 3"). */
  limit: z.number().int().positive().max(25).optional(),
  dry_run: z.boolean().optional(),
  /** For vector_search only. */
  vector_k: z.number().int().positive().max(20).optional(),
  /** For agent_deals: optional filter (e.g. DEAL). Omit to list all invitation types. */
  promotion_type: z.string().max(64).optional(),
  /**
   * For `fetch_item_sku`: Mercado Livre listing / item id (e.g. MLB1234567890). May be omitted
   * if the user message or trace contains a single extractable `ML*…` id.
   */
  anuncio_id: z.string().min(3).max(32).optional(),
  /** Short chain-of-thought for logs / debugging (not shown to end users by default). */
  thought: z.string().max(1500).optional(),
  reason: z.string().max(500)
});

export type OrchestrationDecision = z.infer<typeof OrchestrationDecisionSchema>;

/** Mercado Livre public item / listing id (e.g. MLB1234567890, MLA1234567890). */
const MERCADO_LIVRE_ITEM_ID_RE = /\b(ML[A-Z]{1,3}\d{6,})\b/;

/**
 * Picks the first listing id in free text (user message or execution trace), for SKU lookup.
 */
export function extractMercadoLivreItemIdFromText(text: string): string | undefined {
  const m = text.match(MERCADO_LIVRE_ITEM_ID_RE);
  return m ? m[1] : undefined;
}

const skuIntentInText = (text: string): boolean =>
  /\bsku\b/i.test(text) ||
  /\b(get|buscar|fetch|qual|what).{0,24}\b(sku|c(ó|o)digo)\b/i.test(text) ||
  /\bc(ó|o)digo(s)?\s+(do|da|de)\s+(produto|seller|an(ú|u)ncio|listagem|item)\b/i.test(text);

const normalize = (s: string): string => s.toLowerCase();

const traceHas = (trace: readonly string[], needle: string): boolean =>
  trace.some((line) => line.includes(needle));

const combinedFetchAndAnswerIntent = (t: string): boolean =>
  /\b(and|e|then|depois|em seguida)\b.*\b(answer|responder|draft|rascunho|reply|resposta)\b/i.test(t) ||
  /\b(answer|responder|draft|rascunho).*\b(and|e|then|after|depois)\b.*\b(fetch|buscar|retrieve|perguntas)\b/i.test(t) ||
  /\b(fetch|buscar|retrieve|trazer).*\b(and|e|then|depois)\b.*\b(answer|responder|draft|rascunho)\b/i.test(t) ||
  /\b(buscar|fetch).{0,40}\b(responder|answer|draft)\b/i.test(t) ||
  /\b(pipeline|fluxo completo|end[- ]to[- ]end|tudo de uma vez|tudo numa vez)\b/i.test(t);

/** Used when `OPENAI_API_KEY` is missing or the structured call fails. */
export const inferRouteFromHeuristics = (input: string, trace: readonly string[] = []): OrchestrationDecision => {
  const t = normalize(input);

  if (traceHas(trace, "[fetch_item_sku]")) {
    return { route: "done", reason: "heuristic: fetch_item_sku step completed" };
  }

  if (traceHas(trace, "[agent_questions]")) {
    const id =
      extractMercadoLivreItemIdFromText(input) ?? extractMercadoLivreItemIdFromText(trace.join("\n"));
    if (id && skuIntentInText(input) && !traceHas(trace, "[fetch_item_sku]")) {
      return {
        route: "fetch_item_sku",
        anuncio_id: id,
        reason: "heuristic: after questions, fetch SKU for listing id (from message or item context in trace)"
      };
    }
    return { route: "done", reason: "heuristic: agent_questions already ran (success, dry-run, or failure)" };
  }

  if (traceHas(trace, "[vector_search]")) {
    return { route: "done", reason: "heuristic: vector search step completed" };
  }

  if (traceHas(trace, "[agent_deals]")) {
    return { route: "done", reason: "heuristic: agent_deals step completed" };
  }

  if (traceHas(trace, "[agent_retriever]") && traceHas(trace, "failed")) {
    return { route: "done", reason: "heuristic: retriever failed; stopping" };
  }

  if (traceHas(trace, "[agent_retriever]") && traceHas(trace, "dry_run")) {
    return { route: "done", reason: "heuristic: retriever dry-run finished (no persisted JSON for drafting)" };
  }

  if (traceHas(trace, "[agent_retriever]") && traceHas(trace, "ok") && !traceHas(trace, "[agent_questions]")) {
    if (/\bdry[-_ ]?run\b/i.test(t) && trace.length > 0) {
      return { route: "done", reason: "heuristic: dry-run retriever only; skip drafting" };
    }
    return {
      route: "agent_questions",
      reason: "heuristic: after successful retriever, run questions to draft answers"
    };
  }

  if (
    /\b(help|ajuda|o que você faz|what can you do|how does this work|capabilities)\b/i.test(input) ||
    (t.trim().length < 4 && trace.length === 0)
  ) {
    return { route: "help", reason: "heuristic: help or very short message" };
  }

  {
    const id = extractMercadoLivreItemIdFromText(input);
    if (
      id &&
      skuIntentInText(input) &&
      !traceHas(trace, "[fetch_item_sku]") &&
      !traceHas(trace, "[agent_retriever]") &&
      !traceHas(trace, "[agent_questions]")
    ) {
      return {
        route: "fetch_item_sku",
        anuncio_id: id,
        reason: "heuristic: listing id and SKU / código intent (no retriever/questions leg yet)"
      };
    }
  }

  if (
    /\b(vector|embedding|similarity|semant(ic|a)|busca vetorial)\b/i.test(t) ||
    /\b(find|encontre).{0,40}\b(in (the )?docs|na base|nos documentos)\b/i.test(t)
  ) {
    return { route: "vector_search", reason: "heuristic: vector / semantic search intent" };
  }

  if (
    /\b(list|listar|show|mostrar|available|dispon(í|i)ve|quais|what)\b/i.test(t) &&
    /\b(promo(ç|c)(ã|a)ões|promotions?|deals?|campanhas?|ofertas?|convites?|seller[- ]?promo|central de promo)\b/i.test(
      t
    )
  ) {
    return { route: "agent_deals", reason: "heuristic: list seller promotion invitations" };
  }

  if (combinedFetchAndAnswerIntent(t) && !traceHas(trace, "[agent_retriever]")) {
    return { route: "agent_retriever", reason: "heuristic: combined pipeline — fetch questions first" };
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
  "4) agent_deals — Lista convites de promoção do vendedor no Mercado Livre (DEAL, campanhas, etc.) via `GET /api/mercado-livre/seller-promotions` e grava `src/agent_deals/outputs/seller-promotions.json`.",
  "   Ex.: \"list available promotions\", \"listar campanhas que posso participar\", \"quais promoções posso participar\".",
  "",
  "4b) fetch_item_sku — Consulta o SKU do vendedor para um anúncio (item id MLB…/MLA…) via `GET /api/mercado-livre/items/:id` no proxy.",
  "   Ex.: \"qual o SKU do MLB1234567890?\", após rascunhar respostas: \"e o código do anúncio MLB…\" (id pode vir da mensagem ou do rastro com contexto de item).",
  "",
  "5) help — Esta mensagem.",
  "",
  "O orquestrador pode **encadear** passos (retriever → questions, e fetch_item_sku quando o pedido incluir SKU/código de um anúncio) numa mesma execução até concluir ou atingir o limite de planejamento.",
  "Para um fluxo típico numa frase: \"busque perguntas não respondidas e rascunhe respostas\"."
].join("\n");
