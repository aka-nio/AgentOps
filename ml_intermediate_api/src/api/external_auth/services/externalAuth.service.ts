// SPDX-License-Identifier: MIT
// Copyright (c) 2026 AgentOPsBase contributors
//
// Part of AgentOPsBase. You may use, modify, redistribute, and sell this work
// or derivatives (including commercially) without owing the copyright holders
// anything beyond what the MIT license requires. This file is licensed under
// the terms in the LICENSE file at the repository root. The software is
// provided "AS IS", without warranty; the copyright holders are not liable for
// this code or for what anyone does with it.
import { ZodError } from "zod";
import bcrypt from "bcryptjs";
import {
  externalAuthEnvSchema,
  type ExternalAuthEnv,
} from "../types/env.types.js";
import {
  externalAuthTokenSchema,
  type ExternalAuthTokenResponse,
  type NormalizedExternalAuthToken,
} from "../types/token.types.js";

function normalizeToken(responseBody: unknown): NormalizedExternalAuthToken {
  const parsed: ExternalAuthTokenResponse =
    externalAuthTokenSchema.parse(responseBody);

  if ("token" in parsed) {
    return { token: parsed.token };
  }

  return { token: parsed.access_token };
}

export async function getExternalAuthToken(rawBody: unknown) {
  void rawBody;
  const parsedEnv = externalAuthEnvSchema.safeParse(process.env as ExternalAuthEnv);
  if (!parsedEnv.success) {
    throw new Error("External auth env is invalid");
  }
  const { EXTERNAL_AUTH_PASS, EXTERNAL_AUTH_URL, EXTERNAL_AUTH_USER, key_crypto } =
    parsedEnv.data;
  const securedPass = await bcrypt.hash(`${EXTERNAL_AUTH_PASS}${key_crypto}`, 10);

  let response: Response;
  try {
    response = await fetch(EXTERNAL_AUTH_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        user: EXTERNAL_AUTH_USER,
        pass: securedPass,
      }),
    });
  } catch {
    throw new Error("External auth unavailable");
  }

  if (response.status === 401 || response.status === 403) {
    throw new Error("External authentication failed");
  }

  if (!response.ok) {
    throw new Error("External auth request failed");
  }

  let responseBody: unknown;
  try {
    responseBody = await response.json();
  } catch {
    throw new Error("Invalid external auth response");
  }

  try {
    return normalizeToken(responseBody);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new Error("Invalid external auth response");
    }

    throw error;
  }
}

