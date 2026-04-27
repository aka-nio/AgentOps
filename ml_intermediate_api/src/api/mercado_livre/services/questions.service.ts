// SPDX-License-Identifier: MIT
// Copyright (c) 2026 AgentOPsBase contributors
//
// Part of AgentOPsBase. You may use, modify, redistribute, and sell this work
// or derivatives (including commercially) without owing the copyright holders
// anything beyond what the MIT license requires. This file is licensed under
// the terms in the LICENSE file at the repository root. The software is
// provided "AS IS", without warranty; the copyright holders are not liable for
// this code or for what anyone does with it.
import { listSellerQuestions } from "../../../api_external/mercado_livre/questions/index.js";
import type { MercadoLivreQuestionsResponse } from "../types/questions.types.js";

// proxy_ml: thin proxy over Mercado Livre external API
export async function proxyMlGetSellerQuestions(): Promise<MercadoLivreQuestionsResponse> {
  try {
    return await listSellerQuestions();
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.startsWith("Missing required environment variable")
    ) {
      throw new Error("Mercado Livre env is invalid");
    }

    if (
      error instanceof Error &&
      error.message.startsWith("Mercado Libre API error: 401")
    ) {
      throw new Error("Mercado Livre unauthorized");
    }

    if (
      error instanceof Error &&
      error.message.startsWith("Mercado Libre API error: 403")
    ) {
      throw new Error("Mercado Livre forbidden");
    }

    if (
      error instanceof Error &&
      error.message.startsWith("Mercado Libre API error:")
    ) {
      throw new Error("Mercado Livre request failed");
    }

    throw error;
  }
}

