import { z } from "zod";

export const externalAuthTokenSchema = z.union([
  z.object({ token: z.string().min(1) }),
  z.object({ access_token: z.string().min(1) }),
]);

export type ExternalAuthTokenResponse = z.infer<typeof externalAuthTokenSchema>;
export type NormalizedExternalAuthToken = { token: string };

