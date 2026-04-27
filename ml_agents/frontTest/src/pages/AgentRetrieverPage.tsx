// SPDX-License-Identifier: MIT
// Copyright (c) 2026 AgentOPsBase contributors
//
// Part of AgentOPsBase. You may use, modify, redistribute, and sell this work
// or derivatives (including commercially) without owing the copyright holders
// anything beyond what the MIT license requires. This file is licensed under
// the terms in the LICENSE file at the repository root. The software is
// provided "AS IS", without warranty; the copyright holders are not liable for
// this code or for what anyone does with it.
import { useMemo, useState } from "react";
import { fetchJson, prettyJson, type JsonValue } from "../lib/fetchJson";

type MercadoLivreQuestion = {
  id: number;
  item_id: string;
  seller_id: number;
  status: "UNANSWERED" | "ANSWERED" | "CLOSED_UNANSWERED" | "BANNED";
  text: string;
  date_created: string;
};

type MercadoLivreQuestionsResponse = {
  total: number;
  limit: number;
  questions: MercadoLivreQuestion[];
};

export default function AgentRetrieverPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<JsonValue | null>(null);

  const endpoints = useMemo(
    () => ({
      unansweredQuestions: "/retriever-api/api/mercado-livre/questions?status=UNANSWERED"
    }),
    []
  );

  const run = async (name: string, fn: () => Promise<JsonValue>) => {
    setError(null);
    setResult(null);
    setLoading(name);
    try {
      const data = await fn();
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="page">
      <header className="header">
        <div>
          <h1>Agent retriever</h1>
          <p className="muted">
            UI hook for <code>src/agent_retriever</code> — Mercado Livre questions via the retriever proxy.
          </p>
        </div>
      </header>

      <main className="grid">
        <section className="card">
          <h2>Mercado Livre proxy</h2>
          <p className="muted">
            Fetches <code>UNANSWERED</code> questions from <code>/api/mercado-livre/questions</code>.
          </p>

          <div className="row">
            <button
              onClick={() =>
                run("unanswered", async () =>
                  fetchJson<MercadoLivreQuestionsResponse>(endpoints.unansweredQuestions)
                )
              }
              disabled={loading !== null}
            >
              {loading === "unanswered" ? "Loading..." : "Fetch unanswered questions"}
            </button>
          </div>
        </section>

        <section className="card">
          <h2>Notes</h2>
          <p className="muted small">
            The retriever agent normally runs as a CLI (<code>src/agent_retriever/run.ts</code>). This page
            exercises the same Mercado Livre HTTP surface the tools call.
          </p>
        </section>

        <section className="card full">
          <h2>Result</h2>
          {error ? <pre className="error">{error}</pre> : null}
          {result ? <pre className="pre">{prettyJson(result)}</pre> : <p className="muted">No result yet.</p>}
        </section>
      </main>
    </div>
  );
}
