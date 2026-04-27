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

/** Result of resolving SKU(s) from a listing (anúncio) id via the items API. */
export const ItemSkuByAnuncioResultSchema = z.object({
  anuncio_id: z.string(),
  item_id: z.string(),
  skus: z.array(z.string()),
  /** True when the item was returned but no SKU could be read from the payload */
  sku_not_found: z.boolean()
});

export type ItemSkuByAnuncioResult = z.infer<typeof ItemSkuByAnuncioResultSchema>;
