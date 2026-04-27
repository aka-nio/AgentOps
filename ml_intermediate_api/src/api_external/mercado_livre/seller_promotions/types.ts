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
