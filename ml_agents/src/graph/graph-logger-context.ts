// SPDX-License-Identifier: MIT
// Copyright (c) 2026 AgentOPsBase contributors
//
// Part of AgentOPsBase. You may use, modify, redistribute, and sell this work
// or derivatives (including commercially) without owing the copyright holders
// anything beyond what the MIT license requires. This file is licensed under
// the terms in the LICENSE file at the repository root. The software is
// provided "AS IS", without warranty; the copyright holders are not liable for
// this code or for what anyone does with it.
import type { LangGraphRunnableConfig } from "@langchain/langgraph";
import type { AgentRunLogger } from "../lib/agent-run-log.js";

/** `configurable` key passed into `agentGraph.invoke` so nodes can emit `step` logs on the parent run. */
export const AGENT_GRAPH_LOGGER_CONFIG_KEY = "agentGraphLogger" as const;

export const getAgentGraphLogger = (config?: LangGraphRunnableConfig): AgentRunLogger | undefined => {
  const bag = config?.configurable as Record<string, unknown> | undefined;
  const log = bag?.[AGENT_GRAPH_LOGGER_CONFIG_KEY];
  if (log && typeof log === "object" && log !== null && "runId" in log) {
    return log as AgentRunLogger;
  }
  return undefined;
};
