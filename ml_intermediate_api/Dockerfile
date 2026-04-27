# SPDX-License-Identifier: MIT
# Copyright (c) 2026 AgentOPsBase contributors
#
# Part of AgentOPsBase. You may use, modify, redistribute, and sell this work
# or derivatives (including commercially) without owing the copyright holders
# anything beyond what the MIT license requires. This file is licensed under
# the terms in the LICENSE file at the repository root. The software is
# provided "AS IS", without warranty; the copyright holders are not liable for
# this code or for what anyone does with it.
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npx prisma generate
RUN npm run build

EXPOSE 3000

CMD ["sh", "-c", "npx prisma db push && node dist/server.js"]
