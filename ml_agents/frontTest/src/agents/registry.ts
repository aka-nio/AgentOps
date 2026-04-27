// SPDX-License-Identifier: MIT
// Copyright (c) 2026 AgentOPsBase contributors
//
// Part of AgentOPsBase. You may use, modify, redistribute, and sell this work
// or derivatives (including commercially) without owing the copyright holders
// anything beyond what the MIT license requires. This file is licensed under
// the terms in the LICENSE file at the repository root. The software is
// provided "AS IS", without warranty; the copyright holders are not liable for
// this code or for what anyone does with it.
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
