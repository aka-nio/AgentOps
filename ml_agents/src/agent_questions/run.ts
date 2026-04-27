// SPDX-License-Identifier: MIT
// Copyright (c) 2026 AgentOPsBase contributors
//
// Part of AgentOPsBase. You may use, modify, redistribute, and sell this work
// or derivatives (including commercially) without owing the copyright holders
// anything beyond what the MIT license requires. This file is licensed under
// the terms in the LICENSE file at the repository root. The software is
// provided "AS IS", without warranty; the copyright holders are not liable for
// this code or for what anyone does with it.
import { runAgentQuestions } from "./agent.js";

const limitRaw = process.env.AGENT_QUESTIONS_LIMIT;
const limit = limitRaw ? Number(limitRaw) : undefined;
const payloadPath = process.env.AGENT_QUESTIONS_INPUT_PATH;

const dryRun = process.argv.includes("--dry-run") || process.env.AGENT_QUESTIONS_DRY_RUN === "1";

await runAgentQuestions({
  limit: Number.isFinite(limit) ? limit : undefined,
  dryRun,
  payloadPath
});
