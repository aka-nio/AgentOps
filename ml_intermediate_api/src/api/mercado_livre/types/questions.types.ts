// SPDX-License-Identifier: MIT
// Copyright (c) 2026 AgentOPsBase contributors
//
// Part of AgentOPsBase. You may use, modify, redistribute, and sell this work
// or derivatives (including commercially) without owing the copyright holders
// anything beyond what the MIT license requires. This file is licensed under
// the terms in the LICENSE file at the repository root. The software is
// provided "AS IS", without warranty; the copyright holders are not liable for
// this code or for what anyone does with it.
import type { QuestionsSearchResponse } from "../../../api_external/mercado_livre/questions/types.js";

// Re-export to keep marketplace API types centralized under `api/mercado_livre`
export type MercadoLivreQuestionsResponse = QuestionsSearchResponse;

