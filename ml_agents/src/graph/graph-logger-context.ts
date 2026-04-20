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
