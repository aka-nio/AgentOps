/** Mirrors `src/agent_*` packages in this repo (plus overview for shared HTTP demos). */

export type AgentDefinition = {
  id: string;
  title: string;
  description: string;
  path: string;
};

export const NAV_AGENTS: AgentDefinition[] = [
  {
    id: "agent-retriever",
    title: "Agent retriever",
    description: "Mercado Livre retriever flow (`src/agent_retriever`).",
    path: "/agents/agent-retriever"
  },
  {
    id: "agent-questions",
    title: "Agent questions",
    description: "Question answering agent (`src/agent_questions`).",
    path: "/agents/agent-questions"
  }
];
