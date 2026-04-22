import { z } from "zod";

export const SellerPromotionSummarySchema = z
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

export const SellerPromotionsListResponseSchema = z.object({
  results: z.array(SellerPromotionSummarySchema),
  paging: z
    .object({
      offset: z.number(),
      limit: z.number(),
      total: z.number()
    })
    .optional()
});

export type SellerPromotionsListResponse = z.infer<typeof SellerPromotionsListResponseSchema>;
