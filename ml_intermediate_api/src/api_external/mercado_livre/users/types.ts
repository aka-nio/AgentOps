import { z } from "zod";

// User payloads are large; validate a stable core and keep the rest.
export const mercadoLivreUserCoreSchema = z.object({
  id: z.number(),
  nickname: z.string(),
  registration_date: z.string(),
  country_id: z.string(),
  site_id: z.string(),
  permalink: z.string(),
  user_type: z.string(),
});

export const mercadoLivreUserSchema = mercadoLivreUserCoreSchema.passthrough();

export type MercadoLivreUser = z.infer<typeof mercadoLivreUserSchema>;
