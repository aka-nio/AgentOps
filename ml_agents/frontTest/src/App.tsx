import { useMemo, useState } from "react";
import "./App.css";

type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

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

const pretty = (value: unknown): string => JSON.stringify(value, null, 2);

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const text = await res.text();
  const json = text ? (JSON.parse(text) as unknown) : null;

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}\n${pretty(json)}`);
  }

  return json as T;
}

function App() {
  const [invokeInput, setInvokeInput] = useState("hello from frontTest");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<JsonValue | null>(null);

  const endpoints = useMemo(
    () => ({
      health: "/agent-api/health",
      invoke: "/agent-api/invoke",
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
          <h1>Agent Demo (frontTest)</h1>
          <p className="muted">
            Buttons call your local agent server and Mercado Livre proxy, then render the JSON.
          </p>
        </div>
      </header>

      <main className="grid">
        <section className="card">
          <h2>Agent server</h2>
          <div className="row">
            <button
              onClick={() => run("health", async () => fetchJson(endpoints.health))}
              disabled={loading !== null}
            >
              {loading === "health" ? "Loading..." : "Health"}
            </button>
          </div>

          <div className="row">
            <label className="label" htmlFor="invokeInput">
              /invoke input
            </label>
            <textarea
              id="invokeInput"
              value={invokeInput}
              onChange={(e) => setInvokeInput(e.target.value)}
              rows={4}
            />
          </div>

          <div className="row">
            <button
              onClick={() =>
                run("invoke", async () =>
                  fetchJson(endpoints.invoke, {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ input: invokeInput })
                  })
                )
              }
              disabled={loading !== null}
            >
              {loading === "invoke" ? "Loading..." : "Invoke"}
            </button>
          </div>
        </section>

        <section className="card">
          <h2>Mercado Livre proxy</h2>
          <p className="muted">
            Fetches <code>UNANSWERED</code> questions from{" "}
            <code>/api/mercado-livre/questions</code>.
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

          <p className="muted small">
            Tip: configure targets via <code>frontTest/.env</code> using{" "}
            <code>VITE_AGENT_API_URL</code> and <code>VITE_RETRIEVER_PROXY_ML_URL</code>.
          </p>
        </section>

        <section className="card full">
          <h2>Result</h2>
          {error ? <pre className="error">{error}</pre> : null}
          {result ? <pre className="pre">{pretty(result)}</pre> : <p className="muted">No result yet.</p>}
        </section>
      </main>
    </div>
  );
}

export default App;
