// SPDX-License-Identifier: MIT
// Copyright (c) 2026 AgentOPsBase contributors
//
// Part of AgentOPsBase. You may use, modify, redistribute, and sell this work
// or derivatives (including commercially) without owing the copyright holders
// anything beyond what the MIT license requires. This file is licensed under
// the terms in the LICENSE file at the repository root. The software is
// provided "AS IS", without warranty; the copyright holders are not liable for
// this code or for what anyone does with it.
import { z } from "zod";
import { tool } from "@langchain/core/tools";
import { getAgentRunLogger } from "../../lib/agent-run-log.js";
import { env } from "../../config/env.js";
import { MercadoLivreItemPayloadSchema } from "../types.js";

const FetchItemInputSchema = z.object({
  item_id: z
    .string()
    .min(1, "item_id is required")
    .describe("Mercado Livre item id, e.g. MLB1234567890")
});

export const fetch_ml_item = tool(
  async ({ item_id }: z.infer<typeof FetchItemInputSchema>) => {
    const input = { item_id };
    const run = async () => {
      const baseUrl = env.RETRIEVER_PROXY_ML_URL.replace(/\/+$/, "");
      const url = new URL(`${baseUrl}/api/mercado-livre/items/${encodeURIComponent(item_id)}`);

      const res = await fetch(url.toString(), {
        headers: { accept: "application/json" }
      });

      if (!res.ok) {
        throw new Error(`Proxy request failed: ${res.status} ${res.statusText}`);
      }

      const json = await res.json();
      return MercadoLivreItemPayloadSchema.parse(json);
    };

    const log = getAgentRunLogger();
    if (log) {
      return log.withTool("fetch_ml_item", input, run, { subsystem: "mercado_livre_proxy" });
    }
    return run();
  },
  {
    name: "fetch_ml_item",
    description:
      "Fetch Mercado Livre item details from the retriever proxy API (/api/mercado-livre/items/:itemId).",
    schema: FetchItemInputSchema
  }
);
