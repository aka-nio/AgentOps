// SPDX-License-Identifier: MIT
// Copyright (c) 2026 AgentOPsBase contributors
//
// Part of AgentOPsBase. You may use, modify, redistribute, and sell this work
// or derivatives (including commercially) without owing the copyright holders
// anything beyond what the MIT license requires. This file is licensed under
// the terms in the LICENSE file at the repository root. The software is
// provided "AS IS", without warranty; the copyright holders are not liable for
// this code or for what anyone does with it.
import { z } from "zod";
import { tool } from "@langchain/core/tools";
import { getAgentRunLogger } from "../../lib/agent-run-log.js";
import { env } from "../../config/env.js";
import { MercadoLivreQuestionsResponseSchema, MercadoLivreQuestionStatusSchema } from "../types.js";

const FetchQuestionsInputSchema = z.object({
  status: MercadoLivreQuestionStatusSchema.default("UNANSWERED").describe(
    "Question status filter. Defaults to UNANSWERED."
  )
});

export const fetch_ml_questions = tool(
  async ({ status }: z.infer<typeof FetchQuestionsInputSchema>) => {
    const input = { status };
    const run = async () => {
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
    };

    const log = getAgentRunLogger();
    if (log) {
      return log.withTool("fetch_ml_questions", input, run, { subsystem: "mercado_livre_proxy" });
    }
    return run();
  },
  {
    name: "fetch_ml_questions",
    description:
      "Fetch Mercado Livre questions from the retriever proxy API (/api/mercado-livre/questions) filtered by status.",
    schema: FetchQuestionsInputSchema
  }
);
