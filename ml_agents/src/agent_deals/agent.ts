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
import { type LlmTokenRollup, withAgentRunLog } from "../lib/agent-run-log.js";
import { env } from "../config/env.js";
import { runDealsLlmWithTools } from "./deals-llm.js";
import { fetch_ml_seller_promotions } from "./tools/deals.js";
import type { SellerPromotionsListResponse } from "./types.js";
import { formatUnknownErrorForLog } from "./diagnostics.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const emptyList = (): SellerPromotionsListResponse => ({
  results: [],
  paging: { offset: 0, limit: 0, total: 0 }
});

export type AgentDealsToolTraceEntry = {
  name: string;
  input: unknown;
  output: unknown;
};

export type AgentDealsLlmArtifacts = {
  user_message: string;
  promotion_type_hint: string | null;
  final_assistant_text: string;
  tool_trace: AgentDealsToolTraceEntry[];
  list_invitations: SellerPromotionsListResponse | null;
  mode: "llm_tools" | "legacy_list";
};

/** Duration and LLM token rollup for a single `agent_deals` run (from {@link withAgentRunLog}). */
export type AgentDealsRunMetrics = {
  duration_ms: number;
  llm_tokens: LlmTokenRollup;
};

export type RunAgentDealsOptions = {
  /** When set, only list rows where `type` matches (legacy path or LLM hint). */
  promotionType?: string;
  dryRun?: boolean;
  /**
   * User goal / question (e.g. graph `state.input`). When set and `OPENAI_API_KEY` is set,
   * runs the tool-calling deals agent over all promotion endpoints. Otherwise uses legacy list-only.
   */
  userMessage?: string;
};

export type AgentDealsDryRunResult = {
  mode: "dry_run";
  would_list: number;
  promotion_type_filter: string | null;
  sample: Array<{ id: string; type: string; status: string; name?: string }>;
  run_metrics?: AgentDealsRunMetrics;
};

export type AgentDealsExecutedResult = {
  mode: "executed";
  output_path: string;
  /** Best list snapshot for graph/UI compatibility: from list tool or full list in legacy. */
  response: SellerPromotionsListResponse;
  artifacts: AgentDealsLlmArtifacts;
  run_metrics?: AgentDealsRunMetrics;
};

export type AgentDealsRunResult = AgentDealsDryRunResult | AgentDealsExecutedResult;

const summarize = (r: SellerPromotionsListResponse): string => {
  const lines = r.results.map((p) => {
    const name = p.name ? ` name=${p.name}` : "";
    return `- ${p.id} type=${p.type} status=${p.status}${name}`;
  });
  const paging = r.paging ? ` (paging total=${r.paging.total})` : "";
  return [`${r.results.length} promotion(s)${paging}`, ...lines].join("\n");
};

const runLegacyListOnly = async (options: RunAgentDealsOptions): Promise<{
  response: SellerPromotionsListResponse;
  artifacts: AgentDealsLlmArtifacts;
}> => {
  const response = await fetch_ml_seller_promotions.invoke({
    promotion_type: options.promotionType
  });
  return {
    response,
    artifacts: {
      user_message: options.userMessage?.trim() ?? "",
      promotion_type_hint: options.promotionType?.trim() ?? null,
      final_assistant_text: summarize(response),
      tool_trace: [
        {
          name: "fetch_ml_seller_promotions",
          input: { promotion_type: options.promotionType ?? "" },
          output: response
        }
      ],
      list_invitations: response,
      mode: "legacy_list"
    }
  };
};

export const runAgentDealsWithResult = async (
  options: RunAgentDealsOptions = {}
): Promise<AgentDealsRunResult> => {
  return withAgentRunLog(
    "agent_deals",
    {
      dryRun: Boolean(options.dryRun),
      promotionType: options.promotionType ?? null,
      userMessageLength: options.userMessage?.length ?? 0
    },
    async (log) => {
      const runMetrics = (): AgentDealsRunMetrics => ({
        duration_ms: Date.now() - log.startedAtMs,
        llm_tokens: log.getLlmTokenRollup()
      });

      if (options.dryRun) {
        const response = await fetch_ml_seller_promotions.invoke({
          promotion_type: options.promotionType
        });
        return {
          mode: "dry_run",
          would_list: response.results.length,
          promotion_type_filter: options.promotionType?.trim() ?? null,
          sample: response.results.slice(0, 8).map((p) => ({
            id: p.id,
            type: p.type,
            status: p.status,
            name: typeof p.name === "string" ? p.name : undefined
          })),
          run_metrics: runMetrics()
        };
      }

      const useLlm =
        Boolean(env.OPENAI_API_KEY?.trim()) && Boolean(options.userMessage?.trim());

      const { response, artifacts } = useLlm
        ? await log.withStep("agent_deals_llm", async () => {
            const llm = await runDealsLlmWithTools({
              userMessage: options.userMessage!.trim(),
              promotionTypeHint: options.promotionType
            });
            const list = llm.listInvitations ?? emptyList();
            return {
              response: list,
              artifacts: {
                user_message: options.userMessage!.trim(),
                promotion_type_hint: options.promotionType?.trim() ?? null,
                final_assistant_text: llm.finalText,
                tool_trace: llm.toolTrace,
                list_invitations: llm.listInvitations,
                mode: "llm_tools" as const
              }
            };
          }, {})
        : await runLegacyListOnly(options);

      const outPath = await log.withStep(
        "write_seller_promotions_payload",
        async () => {
          const outDir = path.join(__dirname, "outputs");
          await mkdir(outDir, { recursive: true });
          const targetPath = path.join(outDir, "seller-promotions.json");
          const payload = {
            run_at: new Date().toISOString(),
            ...artifacts,
            list_results_for_compatibility: response
          };
          await writeFile(targetPath, JSON.stringify(payload, null, 2), "utf8");
          return targetPath;
        },
        { resultCount: response.results.length, mode: artifacts.mode }
      );

      return {
        mode: "executed",
        output_path: outPath,
        response,
        artifacts,
        run_metrics: runMetrics()
      };
    }
  );
};

export const runAgentDeals = async (options: RunAgentDealsOptions = {}): Promise<void> => {
  let result: AgentDealsRunResult;
  try {
    result = await runAgentDealsWithResult(options);
  } catch (err) {
    console.error("[agent_deals] runAgentDeals failed", {
      diagnostic: formatUnknownErrorForLog(err),
      ...(err instanceof Error && err.stack ? { stack: err.stack } : {})
    });
    throw err;
  }

  const logMetrics = (m: AgentDealsRunMetrics | undefined): void => {
    if (!m) {
      return;
    }
    const t = m.llm_tokens;
    if (t.interactions > 0) {
      console.log(
        `[agent_deals] metrics: ${m.duration_ms}ms LLM tokens prompt=${t.prompt} completion=${t.completion} total=${t.total} interactions=${t.interactions}`
      );
    } else {
      console.log(`[agent_deals] metrics: ${m.duration_ms}ms (no LLM in this run)`);
    }
  };

  if (result.mode === "dry_run") {
    console.log(
      `[agent_deals] dry-run: would list ${result.would_list} row(s) filter=${result.promotion_type_filter ?? "none"}`
    );
    for (const row of result.sample) {
      console.log(`- ${row.id} ${row.type} ${row.status} ${row.name ?? ""}`.trim());
    }
    logMetrics(result.run_metrics);
    return;
  }

  if (result.artifacts.mode === "llm_tools") {
    console.log(result.artifacts.final_assistant_text);
    console.log(
      `[agent_deals] tools=${result.artifacts.tool_trace.length} list_rows=${result.response.results.length} wrote ${result.output_path}`
    );
    logMetrics(result.run_metrics);
    return;
  }

  console.log(summarize(result.response));
  console.log(`[agent_deals] wrote ${result.output_path}`);
  logMetrics(result.run_metrics);
};
