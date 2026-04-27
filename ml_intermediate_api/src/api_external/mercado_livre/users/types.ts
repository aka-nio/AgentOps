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

// User payloads are large; validate a stable core and keep the rest.
export const mercadoLivreUserCoreSchema = z.object({
  id: z.number(),
  nickname: z.string(),
  registration_date: z.string(),
  country_id: z.string(),
  site_id: z.string(),
  permalink: z.string(),
  user_type: z.string(),
});

export const mercadoLivreUserSchema = mercadoLivreUserCoreSchema.passthrough();

export type MercadoLivreUser = z.infer<typeof mercadoLivreUserSchema>;
