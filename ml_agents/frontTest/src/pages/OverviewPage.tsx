import { useMemo, useState } from "react";
import { fetchJson, prettyJson, type JsonValue } from "../lib/fetchJson";

export default function OverviewPage() {
  const [invokeInput, setInvokeInput] = useState("hello from frontTest");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<JsonValue | null>(null);

  const endpoints = useMemo(
    () => ({
      health: "/ml-agents/health",
      invoke: "/ml-agents/invoke"
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
          <h1>Overview</h1>
          <p className="muted">
            Shared HTTP demos against the main agent server (<code>src/server.ts</code> / graph).
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
          <h2>Environment</h2>
          <p className="muted small">
            Configure <code>VITE_ML_AGENTS_SERVER_URL</code> (the ml_agents <code>src/server.ts</code> process) and{" "}
            <code>VITE_RETRIEVER_PROXY_ML_URL</code> (Mercado Livre Fastify proxy) in <code>frontTest/.env</code>.
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
