// SPDX-License-Identifier: MIT
// Copyright (c) 2026 AgentOPsBase contributors
//
// Part of AgentOPsBase. You may use, modify, redistribute, and sell this work
// or derivatives (including commercially) without owing the copyright holders
// anything beyond what the MIT license requires. This file is licensed under
// the terms in the LICENSE file at the repository root. The software is
// provided "AS IS", without warranty; the copyright holders are not liable for
// this code or for what anyone does with it.
import { withAgentRunLog } from "../lib/agent-run-log.js";
import { invokeAgentGraphWithTelemetry } from "./graph-invoke.js";

const input = process.argv.slice(2).join(" ").trim();

if (!input) {
  console.error('Usage: npm run orchestrator -- "<mensagem para o orquestrador>"');
  process.exit(1);
}

const result = await withAgentRunLog(
  "graph_invoke",
  { inputLength: input.length, input_preview: input.slice(0, 240), source: "cli" },
  async (log) => invokeAgentGraphWithTelemetry(input, log)
);

console.log(`runId: ${result.runId}`);
console.log(`route: ${result.orchestration.route}`);
console.log(`reason: ${result.orchestration.reason}`);
if (result.orchestration.limit !== undefined) {
  console.log(`limit: ${result.orchestration.limit}`);
}
if (result.orchestration.dry_run !== undefined) {
  console.log(`dry_run: ${result.orchestration.dry_run}`);
}
const rollup = result.llm_tokens;
if (rollup.interactions > 0) {
  console.log(
    `llm_tokens: prompt=${rollup.prompt} completion=${rollup.completion} total=${rollup.total} (calls=${rollup.interactions})`
  );
} else {
  console.log("llm_tokens: (no LLM usage reported for this run — e.g. help/heuristic routing only)");
}
console.log("");
if (result.trace.length > 0) {
  console.log("trace:");
  for (const line of result.trace) {
    console.log(`  ${line}`);
  }
  console.log("");
}
console.log(result.output);
