// SPDX-License-Identifier: MIT
// Copyright (c) 2026 AgentOPsBase contributors
//
// Part of AgentOPsBase. You may use, modify, redistribute, and sell this work
// or derivatives (including commercially) without owing the copyright holders
// anything beyond what the MIT license requires. This file is licensed under
// the terms in the LICENSE file at the repository root. The software is
// provided "AS IS", without warranty; the copyright holders are not liable for
// this code or for what anyone does with it.
import { ChatOpenAI } from "@langchain/openai";
import { AIMessage, type BaseMessage, HumanMessage, SystemMessage, ToolMessage } from "@langchain/core/messages";
import { getAgentRunLogger } from "../lib/agent-run-log.js";
import { env } from "../config/env.js";
import { ALL_DEALS_PROMOTION_TOOLS } from "./tools/deals.js";
import { SellerPromotionsListResponseSchema, type SellerPromotionsListResponse } from "./types.js";

const DEALS_SYSTEM = [
  "You are agent_deals for Mercado Livre seller campaigns.",
  "You can call the provided tools to fetch promotion invitations, find promotions that contain a given **seller SKU**, promotion details, items in a campaign, per-listing promotion state, or a candidate by id.",
  "Rules:",
  "- When the user asks for **promoções / campanhas with a product SKU, código, or código interno** (e.g. 'busque promoções com o SKU X'), call **`find_promotions_for_seller_sku`** with that SKU string. " +
    "The Mercado Livre list API does not filter by SKU; that tool lists invitations, loads items per campaign, fetches each item, and matches seller_sku. Mention if the scan was `truncated` and suggest raising caps if needed.",
  "- When the user needs a general overview of campaigns or no SKU is given, use `fetch_ml_seller_promotions` first to obtain promotion id and `type` for follow-up calls.",
  "- For `fetch_ml_seller_promotion_detail` and `fetch_ml_seller_promotion_items`, `promotion_type` is REQUIRED and must match the campaign type of that promotion (e.g. DEAL, SMART, VOLUME) — use values from a prior list result when possible.",
  "- For a specific listing / anúncio, use `fetch_ml_item_promotion_state` with the MLB/MLA item id.",
  "- After you have the data, reply with a short, helpful summary in the same language as the user (Portuguese or English).",
  "Do not invent promotion ids, types, or item ids; only use what the user gave or what tools returned. Extract a bare SKU from quotes or phrases like 'SKU ABC-123'."
].join("\n");

const MAX_LLM_STEPS = 8;
const MAX_TOOL_OUTPUT_CHARS = 18_000;

const capToolJson = (out: unknown): string => {
  const s = typeof out === "string" ? out : JSON.stringify(out);
  if (s.length <= MAX_TOOL_OUTPUT_CHARS) {
    return s;
  }
  return `${s.slice(0, MAX_TOOL_OUTPUT_CHARS)}…(truncated)`;
};

type DealPromotionTool = (typeof ALL_DEALS_PROMOTION_TOOLS)[number];

const toolMap = new Map<string, DealPromotionTool>(ALL_DEALS_PROMOTION_TOOLS.map((t) => [t.name, t]));

const invokePromotionTool = async (tool: DealPromotionTool, args: unknown): Promise<unknown> => {
  const t = tool as { invoke: (input: unknown) => Promise<unknown> };
  return t.invoke(args ?? {});
};

export type DealsLlmRunResult = {
  finalText: string;
  toolTrace: Array<{ name: string; input: unknown; output: unknown }>;
  listInvitations: SellerPromotionsListResponse | null;
};

/**
 * Tool-calling session: the model picks which proxy endpoints to use based on the user message.
 */
export const runDealsLlmWithTools = async (options: {
  userMessage: string;
  promotionTypeHint?: string;
}): Promise<DealsLlmRunResult> => {
  if (!env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required for the deals tool-calling agent.");
  }

  const model = new ChatOpenAI({
    apiKey: env.OPENAI_API_KEY,
    model: "gpt-4o-mini",
    temperature: 0
  }).bindTools([...ALL_DEALS_PROMOTION_TOOLS], { tool_choice: "auto" });

  const userBlock = [
    options.userMessage.trim(),
    options.promotionTypeHint?.trim()
      ? `(Orchestrator hint: optional list filter type = ${options.promotionTypeHint.trim()})`
      : ""
  ]
    .filter(Boolean)
    .join("\n\n");

  const messages: BaseMessage[] = [new SystemMessage(DEALS_SYSTEM), new HumanMessage(userBlock)];

  const toolTrace: Array<{ name: string; input: unknown; output: unknown }> = [];
  let listInvitations: SellerPromotionsListResponse | null = null;
  let finalText = "";

  for (let step = 0; step < MAX_LLM_STEPS; step++) {
    const log = getAgentRunLogger();
    const ai = (
      log
        ? await log.withLlmStep(`deals_llm_round_${step}`, () => model.invoke(messages), {
            round: step,
            model: "gpt-4o-mini"
          })
        : await model.invoke(messages)
    ) as AIMessage;
    messages.push(ai);

    const toolCalls = ai.tool_calls ?? [];
    if (toolCalls.length === 0) {
      const c = ai.content;
      finalText = typeof c === "string" ? c : JSON.stringify(c);
      break;
    }

    for (const call of toolCalls) {
      const name = call.name;
      const id = call.id ?? `call_${step}_${name}`;
      const t = toolMap.get(name);
      if (!t) {
        toolTrace.push({ name, input: call.args, output: { error: "unknown tool" } });
        messages.push(
          new ToolMessage({ content: JSON.stringify({ error: `Unknown tool: ${name}` }), tool_call_id: id })
        );
        continue;
      }

      let out: unknown;
      try {
        out = await invokePromotionTool(t, call.args);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        out = { error: msg };
        toolTrace.push({ name, input: call.args, output: out });
        messages.push(new ToolMessage({ content: capToolJson(out), tool_call_id: id }));
        continue;
      }

      if (name === "fetch_ml_seller_promotions") {
        try {
          listInvitations = SellerPromotionsListResponseSchema.parse(out);
        } catch {
          listInvitations = null;
        }
      }

      toolTrace.push({ name, input: call.args, output: out });
      messages.push(new ToolMessage({ content: capToolJson(out), tool_call_id: id }));
    }
  }

  if (!finalText) {
    const last = messages[messages.length - 1];
    if (last instanceof AIMessage) {
      const c = last.content;
      finalText = typeof c === "string" ? c : JSON.stringify(c);
    }
    if (!finalText) {
      finalText =
        "The deals agent reached the tool-step limit without a final text summary. See tool trace in the run artifact.";
    }
  }

  return { finalText, toolTrace, listInvitations };
};
