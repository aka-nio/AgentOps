// SPDX-License-Identifier: MIT
// Copyright (c) 2026 AgentOPsBase contributors
//
// Part of AgentOPsBase. You may use, modify, redistribute, and sell this work
// or derivatives (including commercially) without owing the copyright holders
// anything beyond what the MIT license requires. This file is licensed under
// the terms in the LICENSE file at the repository root. The software is
// provided "AS IS", without warranty; the copyright holders are not liable for
// this code or for what anyone does with it.
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { withAgentRunLog } from "../lib/agent-run-log.js";
import { fetch_ml_questions } from "./tools/index.js";
import type { MercadoLivreQuestion } from "./types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type RetrieverPreparedPayload = {
  total: number;
  questions: MercadoLivreQuestion[];
};

export type RunAgentRetrieverOptions = {
  limit?: number;
  dryRun?: boolean;
};

export type AgentRetrieverDryRunResult = {
  mode: "dry_run";
  would_process: number;
  questions: Array<{
    id: number;
    item_id: string;
    text_preview: string;
  }>;
};

export type AgentRetrieverExecutedResult = {
  mode: "executed";
  output_path: string;
  question_count: number;
};

export type AgentRetrieverRunResult = AgentRetrieverDryRunResult | AgentRetrieverExecutedResult;

export const runAgentRetrieverWithResult = async (
  options: RunAgentRetrieverOptions = {}
): Promise<AgentRetrieverRunResult> => {
  return withAgentRunLog(
    "agent_retriever",
    { dryRun: Boolean(options.dryRun), limit: options.limit ?? null },
    async (log) => {
      const response = await fetch_ml_questions.invoke({ status: "UNANSWERED" });
      const unanswered = response.questions.filter((q) => q.status === "UNANSWERED");
      const selected = typeof options.limit === "number" ? unanswered.slice(0, options.limit) : unanswered;
      const payload: RetrieverPreparedPayload = {
        total: selected.length,
        questions: selected
      };

      if (options.dryRun) {
        return {
          mode: "dry_run",
          would_process: selected.length,
          questions: selected.map((q) => ({
            id: q.id,
            item_id: q.item_id,
            text_preview: (q.text ?? "").slice(0, 160)
          }))
        };
      }

      const outPath = await log.withStep(
        "write_unanswered_payload",
        async () => {
          const outDir = path.join(__dirname, "outputs");
          await mkdir(outDir, { recursive: true });

          const targetPath = path.join(outDir, "unanswered-questions.json");
          await writeFile(targetPath, JSON.stringify(payload, null, 2), "utf8");
          return targetPath;
        },
        { questionCount: payload.total }
      );

      return {
        mode: "executed",
        output_path: outPath,
        question_count: payload.total
      };
    }
  );
};

export const runAgentRetriever = async (options: RunAgentRetrieverOptions = {}): Promise<void> => {
  const result = await runAgentRetrieverWithResult(options);

  if (result.mode === "dry_run") {
    console.log(`[agent_retriever] dry-run: would prepare ${result.would_process} unanswered questions`);
    console.log(result.questions.map((q) => `- ${q.id} (${q.item_id}) ${q.text_preview.slice(0, 60)}`).join("\n"));
    return;
  }

  console.log(
    `[agent_retriever] prepared ${result.question_count} unanswered questions at ${result.output_path}`
  );
};
