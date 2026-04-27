// SPDX-License-Identifier: MIT
// Copyright (c) 2026 AgentOPsBase contributors
//
// Part of AgentOPsBase. You may use, modify, redistribute, and sell this work
// or derivatives (including commercially) without owing the copyright holders
// anything beyond what the MIT license requires. This file is licensed under
// the terms in the LICENSE file at the repository root. The software is
// provided "AS IS", without warranty; the copyright holders are not liable for
// this code or for what anyone does with it.
import type { BaseMessage } from "@langchain/core/messages";
import type { Serialized } from "@langchain/core/load/serializable";
import type { LLMResult } from "@langchain/core/outputs";
import { BaseCallbackHandler } from "@langchain/core/callbacks/base";
import type { AgentRunLogger, LlmTokenRollup } from "../lib/agent-run-log.js";
import { agentGraph } from "./agent-graph.js";
import { AGENT_GRAPH_LOGGER_CONFIG_KEY } from "./graph-logger-context.js";

export type AgentGraphInvokeState = Awaited<ReturnType<typeof agentGraph.invoke>>;

export type AgentGraphInvokeTelemetryResult = AgentGraphInvokeState & {
  runId: string;
  llm_tokens: LlmTokenRollup;
};

/**
 * LangChain callback: records every chat/LLM completion under the graph run logger
 * (including nested `agent_questions` OpenAI calls), with per-call `tokens` on each
 * `graph_llm_usage` step line in `logs/agents-*.jsonl`.
 */
export class AgentGraphLlmTelemetryHandler extends BaseCallbackHandler {
  name = "agent_graph_llm_telemetry";
  llmEndEventCount = 0;
  private readonly log: AgentRunLogger;
  private readonly llmStarts = new Map<string, number>();

  constructor(log: AgentRunLogger) {
    super();
    this.log = log;
  }

  override async handleLLMStart(_llm: Serialized, _prompts: string[], runId: string): Promise<void> {
    this.llmStarts.set(runId, Date.now());
  }

  override async handleChatModelStart(
    _llm: Serialized,
    _messages: BaseMessage[][],
    runId: string
  ): Promise<void> {
    this.llmStarts.set(runId, Date.now());
  }

  override async handleLLMEnd(
    output: LLMResult,
    runId: string,
    _parentRunId?: string,
    _tags?: string[],
    extraParams?: Record<string, unknown>
  ): Promise<void> {
    const t0 = this.llmStarts.get(runId) ?? Date.now();
    this.llmStarts.delete(runId);
    const durationMs = Math.max(0, Date.now() - t0);
    this.llmEndEventCount += 1;

    const invocation = extraParams?.invocation_params;
    const modelName =
      invocation && typeof invocation === "object" && "model" in invocation
        ? String((invocation as Record<string, unknown>).model)
        : undefined;

    await this.log.logLlmUsageFromCallback(output, durationMs, {
      llm_run_id: runId,
      ...(modelName ? { model: modelName } : {})
    });
  }
}

export const invokeAgentGraphWithTelemetry = async (
  input: string,
  log: AgentRunLogger
): Promise<AgentGraphInvokeTelemetryResult> => {
  const handler = new AgentGraphLlmTelemetryHandler(log);
  const t0 = Date.now();

  const state = await agentGraph.invoke(
    { input },
    {
      recursionLimit: 48,
      callbacks: [handler],
      configurable: { [AGENT_GRAPH_LOGGER_CONFIG_KEY]: log }
    }
  );

  await log.step("graph_langgraph", Date.now() - t0, {
    route: state.orchestration.route,
    planner_depth: state.planner_depth,
    trace_lines: state.trace.length,
    output_length: state.output.length,
    llm_end_events: handler.llmEndEventCount
  });

  return {
    ...state,
    runId: log.runId,
    llm_tokens: log.getLlmTokenRollup()
  };
};
