import { z } from "zod";
import { tool } from "@langchain/core/tools";

/**
 * Example tool using the "method 2" pattern:
 * - Define a Zod schema for inputs
 * - Infer the TypeScript type from the schema for strong typing
 * - Pass the schema into `tool` so the agent can call it safely
 */
const SummarizeTextSchema = z.object({
  text: z.string().min(1, "Text to summarize is required").describe("The input text to be summarized"),
  maxSentences: z
    .number()
    .int()
    .positive()
    .max(5)
    .default(2)
    .describe("Maximum number of sentences in the summary")
});

// Method 2: tool with structured Zod schema
export const summarize_text = tool(
  async ({ text, maxSentences }: z.infer<typeof SummarizeTextSchema>) => {
    const sentences = text.split(/(?<=[.!?])\s+/).filter((s) => s.length > 0);
    const summary = sentences.slice(0, maxSentences).join(" ");
    return summary || text;
  },
  {
    name: "summarize_text",
    description: "Summarize a piece of text to a shorter form.",
    schema: SummarizeTextSchema
  }
);

// Mercado Livre questions types and tool

export const mercadoLivreQuestionStatus = z.enum([
  "UNANSWERED",
  "ANSWERED",
  "CLOSED_UNANSWERED",
  "BANNED"
]);
export type MercadoLivreQuestionStatus = z.infer<typeof mercadoLivreQuestionStatus>;

export const MercadoLivreQuestionSchema = z.object({
  id: z.number(),
  item_id: z.string(),
  seller_id: z.number(),
  status: mercadoLivreQuestionStatus,
  text: z.string(),
  date_created: z.string()
});

export type MercadoLivreQuestion = z.infer<typeof MercadoLivreQuestionSchema>;

export const MercadoLivreQuestionsResponseSchema = z.object({
  total: z.number(),
  limit: z.number(),
  questions: z.array(MercadoLivreQuestionSchema)
});

export type MercadoLivreQuestionsResponse = z.infer<typeof MercadoLivreQuestionsResponseSchema>;

const FetchQuestionsInputSchema = z.object({
  status: mercadoLivreQuestionStatus.describe(
    "Filter for questions: UNANSWERED, ANSWERED, CLOSED_UNANSWERED, or BANNED"
  )
});

/**
 * Tool: fetch_mercado_livre_questions
 *
 * Calls our local proxy API at `http://localhost:3001/mercado-livre/questions`
 * to retrieve Mercado Livre questions filtered by status.
 */
export const fetch_mercado_livre_questions = tool(
  async ({ status }: z.infer<typeof FetchQuestionsInputSchema>) => {
    const url = new URL("http://localhost:3001/mercado-livre/questions");
    url.searchParams.set("status", status);

    const res = await fetch(url.toString());

    if (!res.ok) {
      throw new Error(`Failed to fetch Mercado Livre questions: ${res.status} ${res.statusText}`);
    }

    const json = await res.json();
    const parsed = MercadoLivreQuestionsResponseSchema.parse(json);
    return parsed;
  },
  {
    name: "fetch_mercado_livre_questions",
    description:
      "Fetch Mercado Livre questions via the local proxy API filtered by status (UNANSWERED, ANSWED, CLOSED_UNANSWERED, BANNED).",
    schema: FetchQuestionsInputSchema
  }
);

