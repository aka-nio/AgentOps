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
