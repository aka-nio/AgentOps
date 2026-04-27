// SPDX-License-Identifier: MIT
// Copyright (c) 2026 AgentOPsBase contributors
//
// Part of AgentOPsBase. You may use, modify, redistribute, and sell this work
// or derivatives (including commercially) without owing the copyright holders
// anything beyond what the MIT license requires. This file is licensed under
// the terms in the LICENSE file at the repository root. The software is
// provided "AS IS", without warranty; the copyright holders are not liable for
// this code or for what anyone does with it.
import { AsyncLocalStorage } from "node:async_hooks";
import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import type { LLMResult } from "@langchain/core/outputs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const logsDirectory = (): string => path.join(repoRoot, "logs");

/** Token counts from a LangChain chat `invoke` result (OpenAI sets `usage_metadata` on AIMessage). */
export type LlmTokenUsage = {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
};

export const tokenUsageFromLlmResult = (result: unknown): LlmTokenUsage | undefined => {
  if (!result || typeof result !== "object") {
    return undefined;
  }

  const r = result as Record<string, unknown>;
  const um = r.usage_metadata;
  if (um && typeof um === "object") {
    const o = um as Record<string, unknown>;
    const pt = o.input_tokens;
    const ct = o.output_tokens;
    const tt = o.total_tokens;
    if (typeof pt === "number" || typeof ct === "number" || typeof tt === "number") {
      return {
        promptTokens: typeof pt === "number" ? pt : undefined,
        completionTokens: typeof ct === "number" ? ct : undefined,
        totalTokens:
          typeof tt === "number"
            ? tt
            : typeof pt === "number" && typeof ct === "number"
              ? pt + ct
              : undefined
      };
    }
  }

  const rm = r.response_metadata;
  if (rm && typeof rm === "object") {
    const meta = rm as Record<string, unknown>;
    const usage = meta.usage;
    if (usage && typeof usage === "object") {
      const u = usage as Record<string, unknown>;
      const ppt = u.prompt_tokens;
      const cct = u.completion_tokens;
      const ttt = u.total_tokens;
      if (typeof ppt === "number" || typeof cct === "number" || typeof ttt === "number") {
        return {
          promptTokens: typeof ppt === "number" ? ppt : undefined,
          completionTokens: typeof cct === "number" ? cct : undefined,
          totalTokens: typeof ttt === "number" ? ttt : undefined
        };
      }
    }

    const tu = meta.tokenUsage as { promptTokens?: number; completionTokens?: number; totalTokens?: number } | undefined;
    if (tu && (tu.totalTokens != null || tu.promptTokens != null || tu.completionTokens != null)) {
      return {
        promptTokens: tu.promptTokens,
        completionTokens: tu.completionTokens,
        totalTokens: tu.totalTokens
      };
    }
  }

  return undefined;
};

/** Token usage from a LangChain `LLMResult` (e.g. `handleLLMEnd` callback). */
export const tokenUsageFromLlmResultOutput = (output: LLMResult): LlmTokenUsage | undefined => {
  const generations = output.generations;
  if (Array.isArray(generations)) {
    for (const batch of generations) {
      if (!Array.isArray(batch)) {
        continue;
      }
      for (const gen of batch) {
        if (gen && typeof gen === "object" && "message" in gen) {
          const u = tokenUsageFromLlmResult((gen as { message: unknown }).message);
          if (u) {
            return u;
          }
        }
      }
    }
  }

  const lo = output.llmOutput;
  if (!lo || typeof lo !== "object") {
    return undefined;
  }

  const o = lo as Record<string, unknown>;
  const usage = o.usage;
  if (usage && typeof usage === "object") {
    const u = usage as Record<string, unknown>;
    const ppt = u.prompt_tokens ?? u.input_tokens;
    const cct = u.completion_tokens ?? u.output_tokens;
    const ttt = u.total_tokens;
    if (typeof ppt === "number" || typeof cct === "number" || typeof ttt === "number") {
      return {
        promptTokens: typeof ppt === "number" ? ppt : undefined,
        completionTokens: typeof cct === "number" ? cct : undefined,
        totalTokens:
          typeof ttt === "number"
            ? ttt
            : typeof ppt === "number" && typeof cct === "number"
              ? ppt + cct
              : undefined
      };
    }
  }

  const tu = o.tokenUsage as LlmTokenUsage | undefined;
  if (tu && (tu.totalTokens != null || tu.promptTokens != null || tu.completionTokens != null)) {
    return {
      promptTokens: tu.promptTokens,
      completionTokens: tu.completionTokens,
      totalTokens: tu.totalTokens
    };
  }

  return undefined;
};

const summarizeInput = (input: unknown): unknown => {
  if (input !== null && typeof input === "object" && !Array.isArray(input)) {
    const o = input as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(o)) {
      if (typeof v === "string" && v.length > 240) {
        out[k] = `${v.slice(0, 240)}…`;
      } else {
        out[k] = v;
      }
    }
    return out;
  }
  return input;
};

export type LlmTokenRollup = {
  prompt: number;
  completion: number;
  total: number;
  interactions: number;
};

export class AgentRunLogger {
  readonly runId: string = randomUUID();
  readonly startedAtMs: number = Date.now();
  readonly agent: string;
  private readonly runMeta: Record<string, unknown>;
  private llmRollup: LlmTokenRollup = { prompt: 0, completion: 0, total: 0, interactions: 0 };

  constructor(agent: string, runMeta: Record<string, unknown> = {}) {
    this.agent = agent;
    this.runMeta = runMeta;
  }

  /** Cumulative LLM token counters for this run (updated by `withLlmStep` and graph callbacks). */
  getLlmTokenRollup(): LlmTokenRollup {
    return { ...this.llmRollup };
  }

  /**
   * Records token usage from a LangChain `handleLLMEnd` payload and emits a `step` line
   * (`graph_llm_usage`) so each model call is visible in JSONL even when nested agents run.
   */
  async logLlmUsageFromCallback(
    output: LLMResult,
    durationMs: number,
    fields: Record<string, unknown> = {}
  ): Promise<void> {
    const usage = tokenUsageFromLlmResultOutput(output);
    this.addLlmRollup(usage);

    const tokenFields: Record<string, unknown> = {};
    if (usage) {
      const tokens: Record<string, number> = {};
      if (typeof usage.promptTokens === "number") {
        tokens.prompt = usage.promptTokens;
      }
      if (typeof usage.completionTokens === "number") {
        tokens.completion = usage.completionTokens;
      }
      let total = usage.totalTokens;
      if (typeof total !== "number" && typeof usage.promptTokens === "number" && typeof usage.completionTokens === "number") {
        total = usage.promptTokens + usage.completionTokens;
      }
      if (typeof total === "number") {
        tokens.total = total;
      }
      if (Object.keys(tokens).length > 0) {
        tokenFields.tokens = tokens;
      }
    }

    await this.step("graph_llm_usage", durationMs, { ...fields, ...tokenFields, source: "langchain_callback" });
  }

  private addLlmRollup(usage: LlmTokenUsage | undefined): void {
    if (!usage) {
      return;
    }
    const hasAny =
      typeof usage.promptTokens === "number" ||
      typeof usage.completionTokens === "number" ||
      typeof usage.totalTokens === "number";
    if (!hasAny) {
      return;
    }
    if (typeof usage.promptTokens === "number") {
      this.llmRollup.prompt += usage.promptTokens;
    }
    if (typeof usage.completionTokens === "number") {
      this.llmRollup.completion += usage.completionTokens;
    }
    if (typeof usage.totalTokens === "number") {
      this.llmRollup.total += usage.totalTokens;
    } else if (typeof usage.promptTokens === "number" && typeof usage.completionTokens === "number") {
      this.llmRollup.total += usage.promptTokens + usage.completionTokens;
    }
    this.llmRollup.interactions += 1;
  }

  private async write(kind: string, fields: Record<string, unknown>): Promise<void> {
    const ts = new Date().toISOString();
    const record = { kind, ts, agent: this.agent, runId: this.runId, ...this.runMeta, ...fields };
    const line = `${JSON.stringify(record)}\n`;
    const day = ts.slice(0, 10);
    const filePath = path.join(logsDirectory(), `agents-${day}.jsonl`);
    await mkdir(path.dirname(filePath), { recursive: true });
    await appendFile(filePath, line, "utf8");
  }

  async start(): Promise<void> {
    await this.write("run_start", {});
  }

  async end(fields: Record<string, unknown> = {}): Promise<void> {
    const rollup =
      this.llmRollup.interactions > 0
        ? {
            llm_tokens_cumulative: {
              prompt: this.llmRollup.prompt,
              completion: this.llmRollup.completion,
              total: this.llmRollup.total,
              interactions: this.llmRollup.interactions
            }
          }
        : {};
    await this.write("run_end", { durationMs: Date.now() - this.startedAtMs, ...rollup, ...fields });
  }

  async step(step: string, durationMs: number, fields: Record<string, unknown> = {}): Promise<void> {
    await this.write("step", { step, durationMs, ...fields });
  }

  async tool(tool: string, durationMs: number, fields: Record<string, unknown> = {}): Promise<void> {
    await this.write("tool", { tool, durationMs, ...fields });
  }

  async withStep<T>(step: string, fn: () => Promise<T>, fields: Record<string, unknown> = {}): Promise<T> {
    const t0 = Date.now();
    try {
      const result = await fn();
      await this.step(step, Date.now() - t0, { ...fields, ok: true });
      return result;
    } catch (error) {
      await this.step(step, Date.now() - t0, {
        ...fields,
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async withTool<T>(
    tool: string,
    input: unknown,
    fn: () => Promise<T>,
    extra: Record<string, unknown> = {}
  ): Promise<T> {
    const t0 = Date.now();
    try {
      const result = await fn();
      await this.tool(tool, Date.now() - t0, { ...extra, input: summarizeInput(input), ok: true });
      return result;
    } catch (error) {
      await this.tool(tool, Date.now() - t0, {
        ...extra,
        input: summarizeInput(input),
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Like {@link withStep}, but reads OpenAI/LangChain token usage from the return value when present.
   * Emits `tokens: { prompt, completion, total }` on the `step` log line (omits missing fields).
   */
  async withLlmStep<T>(step: string, fn: () => Promise<T>, fields: Record<string, unknown> = {}): Promise<T> {
    const t0 = Date.now();
    try {
      const result = await fn();
      const usage = tokenUsageFromLlmResult(result);
      this.addLlmRollup(usage);

      const tokenFields: Record<string, unknown> = {};
      if (usage) {
        const tokens: Record<string, number> = {};
        if (typeof usage.promptTokens === "number") {
          tokens.prompt = usage.promptTokens;
        }
        if (typeof usage.completionTokens === "number") {
          tokens.completion = usage.completionTokens;
        }
        let total = usage.totalTokens;
        if (typeof total !== "number" && typeof usage.promptTokens === "number" && typeof usage.completionTokens === "number") {
          total = usage.promptTokens + usage.completionTokens;
        }
        if (typeof total === "number") {
          tokens.total = total;
        }
        if (Object.keys(tokens).length > 0) {
          tokenFields.tokens = tokens;
        }
      }

      await this.step(step, Date.now() - t0, { ...fields, ...tokenFields, ok: true });
      return result;
    } catch (error) {
      await this.step(step, Date.now() - t0, {
        ...fields,
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
}

export const agentRunLogStorage = new AsyncLocalStorage<AgentRunLogger>();

export const getAgentRunLogger = (): AgentRunLogger | undefined => agentRunLogStorage.getStore();

export const withAgentRunLog = async <T>(
  agent: string,
  runMeta: Record<string, unknown>,
  fn: (log: AgentRunLogger) => Promise<T>
): Promise<T> => {
  const log = new AgentRunLogger(agent, runMeta);
  return agentRunLogStorage.run(log, async () => {
    await log.start();
    try {
      const result = await fn(log);
      await log.end({ ok: true });
      return result;
    } catch (error) {
      await log.end({
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  });
};
