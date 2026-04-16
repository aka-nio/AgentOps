import { z } from "zod";

export const externalAuthEnvSchema = z.object({
  EXTERNAL_AUTH_URL: z.string().url("EXTERNAL_AUTH_URL must be a valid URL"),
  EXTERNAL_AUTH_USER: z.string().min(1, "EXTERNAL_AUTH_USER is required"),
  EXTERNAL_AUTH_PASS: z.string().min(1, "EXTERNAL_AUTH_PASS is required"),
  key_crypto: z.string().min(1, "key_crypto is required"),
});

export type ExternalAuthEnv = z.infer<typeof externalAuthEnvSchema>;

