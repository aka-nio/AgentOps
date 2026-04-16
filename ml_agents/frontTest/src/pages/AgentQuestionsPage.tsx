import { useCallback, useMemo, useState } from "react";
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

type DryRunResult = {
  mode: "dry_run";
  source: "inline_payload" | "file";
  source_path?: string;
  total_unanswered: number;
  would_process: number;
  questions: Array<{
    id: number;
    item_id: string;
    status: string;
    text_preview: string;
  }>;
};

type CompletedResult = {
  mode: "completed";
  run: {
    run_at: string;
    source_payload_path: string;
    total_answers: number;
    answers: Array<{
      question_id: number;
      item_id: string;
      status: string;
      question_text: string;
      used_item_context: boolean;
      item_context_error?: string;
      answer: string;
    }>;
  };
  persisted: boolean;
};

type RunResponse = DryRunResult | CompletedResult;

const parseLimit = (raw: string): number | undefined => {
  const t = raw.trim();
  if (!t) {
    return undefined;
  }
  const n = Number(t);
  return Number.isFinite(n) && n > 0 ? Math.min(25, Math.floor(n)) : undefined;
};

export default function AgentQuestionsPage() {
  const [retrieverData, setRetrieverData] = useState<MercadoLivreQuestionsResponse | null>(null);
  const [limitInput, setLimitInput] = useState("");
  const [dryRun, setDryRun] = useState(false);
  const [persist, setPersist] = useState(true);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [runResult, setRunResult] = useState<RunResponse | null>(null);
  const [rawJson, setRawJson] = useState<JsonValue | null>(null);

  const endpoints = useMemo(
    () => ({
      unansweredQuestions: "/retriever-api/api/mercado-livre/questions?status=UNANSWERED",
      agentQuestionsRun: "/ml-agents/agent-questions/run"
    }),
    []
  );

  const unansweredCount = useMemo(() => {
    if (!retrieverData) {
      return 0;
    }
    return retrieverData.questions.filter((q) => q.status === "UNANSWERED").length;
  }, [retrieverData]);

  const fetchFromRetriever = useCallback(async () => {
    setError(null);
    setRunResult(null);
    setRawJson(null);
    setLoading("fetch");
    try {
      const data = await fetchJson<MercadoLivreQuestionsResponse>(endpoints.unansweredQuestions);
      setRetrieverData(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(null);
    }
  }, [endpoints.unansweredQuestions]);

  const runAgent = useCallback(async () => {
    setError(null);
    setRunResult(null);
    setRawJson(null);

    if (!retrieverData) {
      setError("Load unanswered questions from the retriever first (or we could add raw JSON later).");
      return;
    }

    const limit = parseLimit(limitInput);
    setLoading("run");
    try {
      const body = {
        payload: {
          total: retrieverData.total,
          questions: retrieverData.questions
        },
        dryRun,
        persist,
        ...(limit !== undefined ? { limit } : {})
      };

      const result = await fetchJson<RunResponse>(endpoints.agentQuestionsRun, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body)
      });
      setRunResult(result);
      setRawJson(result as unknown as JsonValue);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(null);
    }
  }, [dryRun, endpoints.agentQuestionsRun, limitInput, persist, retrieverData]);

  return (
    <div className="page">
      <header className="header">
        <div>
          <h1>Agent questions</h1>
          <p className="muted">
            Loads Mercado Livre questions via the retriever proxy, then calls{" "}
            <code>POST /agent-questions/run</code> on the Node server from this repo (<code>src/server.ts</code>,
            proxied as <code>/ml-agents/…</code>).
          </p>
        </div>
      </header>

      <main className="grid">
        <section className="card">
          <h2>1. Payload</h2>
          <p className="muted small">
            Same shape as <code>src/agent_retriever/outputs/unanswered-questions.json</code> (from the proxy).
          </p>
          <div className="row">
            <button onClick={() => void fetchFromRetriever()} disabled={loading !== null}>
              {loading === "fetch" ? "Loading..." : "Fetch UNANSWERED from retriever"}
            </button>
          </div>
          {retrieverData ? (
            <p className="muted small">
              Loaded <strong>{retrieverData.questions.length}</strong> questions (
              <strong>{unansweredCount}</strong> unanswered).
            </p>
          ) : (
            <p className="muted small">No payload in memory yet.</p>
          )}
        </section>

        <section className="card">
          <h2>2. Run options</h2>
          <div className="row">
            <label className="label" htmlFor="limitInput">
              Limit (optional, max 25, blank = all unanswered)
            </label>
            <input
              id="limitInput"
              className="input-text"
              type="text"
              inputMode="numeric"
              placeholder="e.g. 3"
              value={limitInput}
              onChange={(e) => setLimitInput(e.target.value)}
            />
          </div>
          <div className="row row-inline">
            <label className="check">
              <input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} />
              Dry run (no model calls; lists questions that would run)
            </label>
          </div>
          <div className="row row-inline">
            <label className="check">
              <input
                type="checkbox"
                checked={persist}
                onChange={(e) => setPersist(e.target.checked)}
                disabled={dryRun}
              />
              Persist to server <code>outputs/</code> (answers-created + history)
            </label>
          </div>
          <div className="row">
            <button onClick={() => void runAgent()} disabled={loading !== null || !retrieverData}>
              {loading === "run" ? "Running..." : dryRun ? "Dry run" : "Run agent questions"}
            </button>
          </div>
        </section>

        {runResult?.mode === "completed" ? (
          <section className="card full">
            <h2>Drafted answers</h2>
            <p className="muted small">
              Run at {runResult.run.run_at} — persisted: {runResult.persisted ? "yes" : "no"} — source:{" "}
              <code>{runResult.run.source_payload_path}</code>
            </p>
            <ul className="answer-list">
              {runResult.run.answers.map((a) => (
                <li key={a.question_id} className="answer-card">
                  <div className="answer-meta">
                    <span className="mono">Q{a.question_id}</span>
                    <span className="mono">{a.item_id}</span>
                    {a.used_item_context ? <span className="pill">item context</span> : null}
                    {a.item_context_error ? (
                      <span className="pill pill-warn" title={a.item_context_error}>
                        item fetch issue
                      </span>
                    ) : null}
                  </div>
                  <p className="answer-q">{a.question_text || "(empty)"}</p>
                  <p className="answer-a">{a.answer}</p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {runResult?.mode === "dry_run" ? (
          <section className="card full">
            <h2>Dry run preview</h2>
            <p className="muted small">
              Would process <strong>{runResult.would_process}</strong> of <strong>{runResult.total_unanswered}</strong>{" "}
              unanswered (source: {runResult.source}
              {runResult.source_path ? ` — ${runResult.source_path}` : ""}).
            </p>
            <ul className="dry-list">
              {runResult.questions.map((q) => (
                <li key={q.id}>
                  <span className="mono">{q.id}</span> · <span className="mono">{q.item_id}</span> — {q.text_preview}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="card full">
          <h2>Raw response</h2>
          {error ? <pre className="error">{error}</pre> : null}
          {rawJson ? <pre className="pre">{prettyJson(rawJson)}</pre> : <p className="muted">No run result yet.</p>}
        </section>
      </main>
    </div>
  );
}
