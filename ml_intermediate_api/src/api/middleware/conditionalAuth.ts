// SPDX-License-Identifier: MIT
// Copyright (c) 2026 AgentOPsBase contributors
//
// Part of AgentOPsBase. You may use, modify, redistribute, and sell this work
// or derivatives (including commercially) without owing the copyright holders
// anything beyond what the MIT license requires. This file is licensed under
// the terms in the LICENSE file at the repository root. The software is
// provided "AS IS", without warranty; the copyright holders are not liable for
// this code or for what anyone does with it.
import type { FastifyReply, FastifyRequest } from "fastify";
import jwt from "jsonwebtoken";

const AUTH_OFF = "off";

export async function conditionalAuth(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const authStatus = process.env.AUTH_STATUS ?? AUTH_OFF;

  if (authStatus === AUTH_OFF) {
    return;
  }

  const authorizationHeader = request.headers.authorization;
  if (!authorizationHeader?.startsWith("Bearer ")) {
    reply.code(401).send({ error: "Unauthorized", message: "Missing bearer token" });
    return;
  }

  const token = authorizationHeader.slice("Bearer ".length);
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    reply
      .code(500)
      .send({ error: "Configuration error", message: "JWT secret is missing" });
    return;
  }

  try {
    jwt.verify(token, jwtSecret);
  } catch {
    reply.code(401).send({ error: "Unauthorized", message: "Invalid token" });
  }
}
