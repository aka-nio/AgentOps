import { z } from "zod";

export const createCandidateSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
});

export const updateCandidateSchema = z
  .object({
    name: z.string().min(2).max(100).optional(),
    email: z.string().email().optional(),
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "At least one field must be provided",
  });

export const queryCandidateSchema = z.object({
  search: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
  offset: z.coerce.number().int().nonnegative().default(0),
});

export const candidateSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type CreateCandidateInput = z.infer<typeof createCandidateSchema>;
export type UpdateCandidateInput = z.infer<typeof updateCandidateSchema>;
export type QueryCandidateInput = z.infer<typeof queryCandidateSchema>;
export type Candidate = z.infer<typeof candidateSchema>;
