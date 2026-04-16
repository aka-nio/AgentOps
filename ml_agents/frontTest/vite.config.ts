import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const agentTarget = env.VITE_AGENT_API_URL || "http://localhost:3000";
  const retrieverTarget = env.VITE_RETRIEVER_PROXY_ML_URL || "http://localhost:3001";

  return {
    plugins: [react()],
    server: {
      proxy: {
        "/agent-api": {
          target: agentTarget,
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/agent-api/, "")
        },
        "/retriever-api": {
          target: retrieverTarget,
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/retriever-api/, "")
        }
      }
    }
  };
});
