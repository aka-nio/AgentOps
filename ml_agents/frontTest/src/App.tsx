// SPDX-License-Identifier: MIT
// Copyright (c) 2026 AgentOPsBase contributors
//
// Part of AgentOPsBase. You may use, modify, redistribute, and sell this work
// or derivatives (including commercially) without owing the copyright holders
// anything beyond what the MIT license requires. This file is licensed under
// the terms in the LICENSE file at the repository root. The software is
// provided "AS IS", without warranty; the copyright holders are not liable for
// this code or for what anyone does with it.
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import "./App.css";
import RootLayout from "./layouts/RootLayout";
import OverviewPage from "./pages/OverviewPage";
import AgentQuestionsPage from "./pages/AgentQuestionsPage";
import AgentRetrieverPage from "./pages/AgentRetrieverPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<RootLayout />}>
          <Route path="/" element={<OverviewPage />} />
          <Route path="/agents/agent-retriever" element={<AgentRetrieverPage />} />
          <Route path="/agents/agent-questions" element={<AgentQuestionsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
