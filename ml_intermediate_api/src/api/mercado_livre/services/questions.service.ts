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

