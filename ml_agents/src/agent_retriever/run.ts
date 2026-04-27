// SPDX-License-Identifier: MIT
// Copyright (c) 2026 AgentOPsBase contributors
//
// Part of AgentOPsBase. You may use, modify, redistribute, and sell this work
// or derivatives (including commercially) without owing the copyright holders
// anything beyond what the MIT license requires. This file is licensed under
// the terms in the LICENSE file at the repository root. The software is
// provided "AS IS", without warranty; the copyright holders are not liable for
// this code or for what anyone does with it.
import { runAgentRetriever } from "./agent.js";

const limitRaw = process.env.RETRIEVER_LIMIT;
const limit = limitRaw ? Number(limitRaw) : undefined;

const dryRun = process.argv.includes("--dry-run") || process.env.RETRIEVER_DRY_RUN === "1";

await runAgentRetriever({
  limit: Number.isFinite(limit) ? limit : undefined,
  dryRun
});

