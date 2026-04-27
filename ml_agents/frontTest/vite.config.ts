// SPDX-License-Identifier: MIT
// Copyright (c) 2026 AgentOPsBase contributors
//
// Part of AgentOPsBase. You may use, modify, redistribute, and sell this work
// or derivatives (including commercially) without owing the copyright holders
// anything beyond what the MIT license requires. This file is licensed under
// the terms in the LICENSE file at the repository root. The software is
// provided "AS IS", without warranty; the copyright holders are not liable for
// this code or for what anyone does with it.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

/** Directory containing this file (`frontTest/`), not `process.cwd()` — so `.env` is always picked up. */
const frontTestRoot = path.dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, frontTestRoot, "VITE_");
  /** Node server from this repo (`src/server.ts`). Prefer this over VITE_AGENT_API_URL when that URL is the Fastify ML proxy. */
  const mlAgentsTarget =
    env.VITE_ML_AGENTS_SERVER_URL || env.VITE_AGENT_API_URL || "http://localhost:3000";
  const retrieverTarget = env.VITE_RETRIEVER_PROXY_ML_URL || "http://localhost:3001";

  return {
    envDir: frontTestRoot,
    plugins: [
      react(),
      {
        name: "fronttest-log-proxy-targets",
        configureServer() {
          console.info(`[frontTest] Vite envDir: ${frontTestRoot}`);
          console.info(`[frontTest] proxy /ml-agents -> ${mlAgentsTarget}`);
          console.info(`[frontTest] proxy /retriever-api -> ${retrieverTarget}`);
        }
      }
    ],
    server: {
      proxy: {
        "/ml-agents": {
          target: mlAgentsTarget,
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/ml-agents/, "")
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
