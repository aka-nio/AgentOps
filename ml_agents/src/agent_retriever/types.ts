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

/**
 * Item payload from the proxy. Shape varies by proxy implementation; we keep a
 * type-safe object map so callers can narrow fields as needed.
 */
export const MercadoLivreItemPayloadSchema = z.record(z.string(), z.unknown());

export type MercadoLivreItemPayload = z.infer<typeof MercadoLivreItemPayloadSchema>;

