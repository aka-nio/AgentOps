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

// Mercado Livre item payloads are large and evolve over time.
// We validate a stable "core" subset and keep the full payload as unknown extras.
export const mercadoLivreItemCoreSchema = z.object({
  id: z.string(),
  site_id: z.string(),
  title: z.string(),
  category_id: z.string(),
  price: z.number(),
  currency_id: z.string(),
  available_quantity: z.number(),
  sold_quantity: z.number(),
  buying_mode: z.string(),
  listing_type_id: z.string(),
  condition: z.string(),
  permalink: z.string(),
  thumbnail: z.string(),
  status: z.string(),
});

export const mercadoLivreItemSchema = mercadoLivreItemCoreSchema.passthrough();

export type MercadoLivreItem = z.infer<typeof mercadoLivreItemSchema>;
