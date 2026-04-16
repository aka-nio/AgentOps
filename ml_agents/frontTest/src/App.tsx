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
