// SPDX-License-Identifier: MIT
// Copyright (c) 2026 AgentOPsBase contributors
//
// Part of AgentOPsBase. You may use, modify, redistribute, and sell this work
// or derivatives (including commercially) without owing the copyright holders
// anything beyond what the MIT license requires. This file is licensed under
// the terms in the LICENSE file at the repository root. The software is
// provided "AS IS", without warranty; the copyright holders are not liable for
// this code or for what anyone does with it.
import { MongoClient } from "mongodb";
import { env } from "../config/env.js";

let mongoClient: MongoClient | null = null;

export const getMongoClient = async (): Promise<MongoClient> => {
  if (mongoClient) {
    return mongoClient;
  }

  if (!env.MONGODB_URI) {
    throw new Error("MONGODB_URI is required to use MongoDB features.");
  }

  mongoClient = new MongoClient(env.MONGODB_URI);
  await mongoClient.connect();
  return mongoClient;
};

export const closeMongoClient = async (): Promise<void> => {
  if (!mongoClient) {
    return;
  }

  await mongoClient.close();
  mongoClient = null;
};
