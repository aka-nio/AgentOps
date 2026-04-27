// SPDX-License-Identifier: MIT
// Copyright (c) 2026 AgentOPsBase contributors
//
// Part of AgentOPsBase. You may use, modify, redistribute, and sell this work
// or derivatives (including commercially) without owing the copyright holders
// anything beyond what the MIT license requires. This file is licensed under
// the terms in the LICENSE file at the repository root. The software is
// provided "AS IS", without warranty; the copyright holders are not liable for
// this code or for what anyone does with it.
import { env } from "../config/env.js";
import { logAndWrapAgentDealsError, logHttpErrorAndThrow } from "./diagnostics.js";

/**
 * GET JSON from ml_intermediate_api (`RETRIEVER_PROXY_ML_URL`). Path must include `/api/...`.
 */
export async function fetchMercadoLivreProxyJson(
  pathWithLeadingSlash: string,
  searchParams?: Record<string, string | undefined>
): Promise<unknown> {
  const baseUrl = env.RETRIEVER_PROXY_ML_URL.replace(/\/+$/, "");
  const p = pathWithLeadingSlash.startsWith("/") ? pathWithLeadingSlash : `/${pathWithLeadingSlash}`;
  const url = new URL(`${baseUrl}${p}`);
  if (searchParams) {
    for (const [k, v] of Object.entries(searchParams)) {
      if (v !== undefined && v !== null && v !== "") {
        url.searchParams.set(k, v);
      }
    }
  }
  const href = url.toString();
  let res: Response;
  try {
    res = await fetch(href, { headers: { accept: "application/json" } });
  } catch (err) {
    throw logAndWrapAgentDealsError(err, { url: href, stage: "fetch" });
  }
  const rawText = await res.text();
  if (!res.ok) {
    logHttpErrorAndThrow({ url: href, status: res.status, statusText: res.statusText, bodyText: rawText });
  }
  try {
    return rawText.length > 0 ? JSON.parse(rawText) : {};
  } catch (err) {
    console.error("[agent_deals] invalid JSON from proxy", { url: href, rawPreview: rawText.slice(0, 500) });
    throw err instanceof Error ? err : new Error(String(err));
  }
}
