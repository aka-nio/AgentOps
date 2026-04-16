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
