import { z } from "zod";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

const loadDotEnvIfPresent = (): void => {
  const envPath = path.join(process.cwd(), ".env");
  if (!existsSync(envPath)) {
    return;
  }

  const raw = readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const eq = trimmed.indexOf("=");
    if (eq === -1) {
      continue;
    }

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (!key) {
      continue;
    }

    // Strip surrounding quotes if present.
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
};

loadDotEnvIfPresent();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  MONGODB_URI: z.string().optional().default(""),
  MONGODB_DB_NAME: z.string().default("agent_ops"),
  MONGODB_VECTOR_COLLECTION: z.string().default("agent_embeddings"),
  MONGODB_VECTOR_INDEX: z.string().default("vector_index"),
  OPENAI_API_KEY: z.string().optional().default(""),
  EMBEDDING_MODEL: z.string().default("text-embedding-3-small"),
  RETRIEVER_PROXY_ML_URL: z.string().url("RETRIEVER_PROXY_ML_URL must be a valid URL")
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ");
  throw new Error(`Invalid environment variables: ${issues}`);
}

export const env = parsed.data;
