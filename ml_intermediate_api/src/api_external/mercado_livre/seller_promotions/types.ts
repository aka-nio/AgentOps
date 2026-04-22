import { z } from "zod";

/** One invited promotion row (Mercado Libre may add fields). */
export const sellerPromotionSummarySchema = z
  .object({
    id: z.string(),
    type: z.string(),
    status: z.string(),
    start_date: z.string().optional(),
    finish_date: z.string().optional(),
    deadline_date: z.string().optional(),
    name: z.string().optional()
  })
  .passthrough();

export type SellerPromotionSummary = z.infer<typeof sellerPromotionSummarySchema>;

export const sellerPromotionsListResponseSchema = z
  .object({
    results: z.array(sellerPromotionSummarySchema),
    paging: z
      .object({
        offset: z.number(),
        limit: z.number(),
        total: z.number()
      })
      .optional()
  })
  .passthrough();

export type SellerPromotionsListResponse = z.infer<typeof sellerPromotionsListResponseSchema>;
