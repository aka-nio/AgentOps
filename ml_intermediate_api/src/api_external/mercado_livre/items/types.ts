import { z } from "zod";

// Mercado Livre item payloads are large and evolve over time.
// We validate a stable "core" subset and keep the full payload as unknown extras.
export const mercadoLivreItemCoreSchema = z.object({
  id: z.string(),
  site_id: z.string(),
  title: z.string(),
  category_id: z.string(),
  price: z.number(),
  currency_id: z.string(),
  available_quantity: z.number(),
  sold_quantity: z.number(),
  buying_mode: z.string(),
  listing_type_id: z.string(),
  condition: z.string(),
  permalink: z.string(),
  thumbnail: z.string(),
  status: z.string(),
});

export const mercadoLivreItemSchema = mercadoLivreItemCoreSchema.passthrough();

export type MercadoLivreItem = z.infer<typeof mercadoLivreItemSchema>;
