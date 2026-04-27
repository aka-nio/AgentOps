// SPDX-License-Identifier: MIT
// Copyright (c) 2026 AgentOPsBase contributors
//
// Part of AgentOPsBase. You may use, modify, redistribute, and sell this work
// or derivatives (including commercially) without owing the copyright holders
// anything beyond what the MIT license requires. This file is licensed under
// the terms in the LICENSE file at the repository root. The software is
// provided "AS IS", without warranty; the copyright holders are not liable for
// this code or for what anyone does with it.
import https from "node:https";

const ML_API_BASE_URL = "https://api.mercadolibre.com";

export function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value;
}

/**
 * Authenticated GET to `api.mercadolibre.com`, returns parsed JSON.
 * If `app_version` is not in `searchParams`, it defaults to `v2`.
 *
 * @param pathWithLeadingSlash e.g. `/seller-promotions/promotions/P-MLB1/items`
 */
export function mercadoLivreGetJson(
  pathWithLeadingSlash: string,
  searchParams: Record<string, string | undefined> = {}
): Promise<unknown> {
  const accessToken = getRequiredEnv("ML_TOKEN_SECRET");
  const path = pathWithLeadingSlash.startsWith("/")
    ? pathWithLeadingSlash
    : `/${pathWithLeadingSlash}`;
  const url = new URL(`${ML_API_BASE_URL}${path}`);
  for (const [k, v] of Object.entries(searchParams)) {
    if (v !== undefined && v !== "") {
      url.searchParams.set(k, v);
    }
  }
  if (!url.searchParams.has("app_version")) {
    url.searchParams.set("app_version", "v2");
  }

  return new Promise((resolve, reject) => {
    const req = https.request(
      url,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      },
      (res) => {
        const statusCode = res.statusCode ?? 0;
        const chunks: Buffer[] = [];
        res.on("data", (chunk) => {
          chunks.push(chunk);
        });
        res.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf8");
          if (statusCode >= 200 && statusCode < 300) {
            try {
              const json = (body.length > 0 ? JSON.parse(body) : {}) as unknown;
              resolve(json);
            } catch (e) {
              reject(
                e instanceof Error
                  ? e
                  : new Error("Invalid JSON in Mercado Libre response")
              );
            }
            return;
          }
          reject(
            new Error(`Mercado Libre API error: ${statusCode} - ${body.slice(0, 500)}`)
          );
        });
      }
    );
    req.on("error", reject);
    req.end();
  });
}
