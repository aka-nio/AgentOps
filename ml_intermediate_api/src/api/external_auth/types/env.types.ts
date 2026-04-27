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

export const externalAuthEnvSchema = z.object({
  EXTERNAL_AUTH_URL: z.string().url("EXTERNAL_AUTH_URL must be a valid URL"),
  EXTERNAL_AUTH_USER: z.string().min(1, "EXTERNAL_AUTH_USER is required"),
  EXTERNAL_AUTH_PASS: z.string().min(1, "EXTERNAL_AUTH_PASS is required"),
  key_crypto: z.string().min(1, "key_crypto is required"),
});

export type ExternalAuthEnv = z.infer<typeof externalAuthEnvSchema>;

