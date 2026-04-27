// SPDX-License-Identifier: MIT
// Copyright (c) 2026 AgentOPsBase contributors
//
// Part of AgentOPsBase. You may use, modify, redistribute, and sell this work
// or derivatives (including commercially) without owing the copyright holders
// anything beyond what the MIT license requires. This file is licensed under
// the terms in the LICENSE file at the repository root. The software is
// provided "AS IS", without warranty; the copyright holders are not liable for
// this code or for what anyone does with it.
import { MongoDBAtlasVectorSearch } from "@langchain/mongodb";
import { OpenAIEmbeddings } from "@langchain/openai";
import { env } from "../config/env.js";
import { getMongoClient } from "./mongodb.js";

export const getVectorStore = async (): Promise<MongoDBAtlasVectorSearch> => {
  if (!env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required to use vector search features.");
  }

  const client = await getMongoClient();
  const collection = client
    .db(env.MONGODB_DB_NAME)
    .collection(env.MONGODB_VECTOR_COLLECTION);

  return new MongoDBAtlasVectorSearch(
    new OpenAIEmbeddings({
      apiKey: env.OPENAI_API_KEY,
      model: env.EMBEDDING_MODEL
    }),
    {
      collection,
      indexName: env.MONGODB_VECTOR_INDEX,
      textKey: "text",
      embeddingKey: "embedding"
    }
  );
};
