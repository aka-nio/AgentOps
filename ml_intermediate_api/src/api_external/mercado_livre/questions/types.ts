import { z } from "zod";

export const mercadoLivreQuestionSchema = z.object({
  id: z.number(),
  item_id: z.string(),
  seller_id: z.number(),
  status: z.string(),
  text: z.string().nullable(),
  date_created: z.string(),
});

export const questionsSearchResponseSchema = z.object({
  total: z.number(),
  limit: z.number(),
  questions: z.array(mercadoLivreQuestionSchema),
});

export type MercadoLivreQuestion = z.infer<typeof mercadoLivreQuestionSchema>;
export type QuestionsSearchResponse = z.infer<
  typeof questionsSearchResponseSchema
>;

