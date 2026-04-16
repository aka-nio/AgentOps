import { z } from "zod";
import { tool } from "@langchain/core/tools";
import { env } from "../config/env.js";
import { MercadoLivreQuestionsResponseSchema, MercadoLivreQuestionStatusSchema } from "./types.js";

const FetchQuestionsInputSchema = z.object({
  status: MercadoLivreQuestionStatusSchema.default("UNANSWERED").describe(
    "Question status filter. Defaults to UNANSWERED."
  )
});

export const fetch_ml_questions = tool(
  async ({ status }: z.infer<typeof FetchQuestionsInputSchema>) => {
    const baseUrl = env.RETRIEVER_PROXY_ML_URL.replace(/\/+$/, "");
    const url = new URL(`${baseUrl}/api/mercado-livre/questions`);
    url.searchParams.set("status", status);

    const res = await fetch(url.toString(), {
      headers: { accept: "application/json" }
    });

    if (!res.ok) {
      throw new Error(`Proxy request failed: ${res.status} ${res.statusText}`);
    }

    const json = await res.json();
    return MercadoLivreQuestionsResponseSchema.parse(json);
  },
  {
    name: "fetch_ml_questions",
    description:
      "Fetch Mercado Livre questions from the retriever proxy API (/api/mercado-livre/questions) filtered by status.",
    schema: FetchQuestionsInputSchema
  }
);

