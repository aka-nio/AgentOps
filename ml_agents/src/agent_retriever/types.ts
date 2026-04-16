import { z } from "zod";

export const MercadoLivreQuestionStatusSchema = z.enum([
  "UNANSWERED",
  "ANSWERED",
  "CLOSED_UNANSWERED",
  "BANNED"
]);

export type MercadoLivreQuestionStatus = z.infer<typeof MercadoLivreQuestionStatusSchema>;

export const MercadoLivreQuestionSchema = z.object({
  id: z.number(),
  item_id: z.string(),
  seller_id: z.number(),
  status: MercadoLivreQuestionStatusSchema,
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

