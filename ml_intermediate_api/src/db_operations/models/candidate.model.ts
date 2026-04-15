import type { PrismaClient } from "@prisma/client";
import type {
  Candidate,
  CreateCandidateInput,
  QueryCandidateInput,
  UpdateCandidateInput,
} from "../db_types/candidate.schema.js";
import prismaInstance from "../prismaInstance.js";

const prisma = prismaInstance as PrismaClient;

export async function createCandidate(
  data: CreateCandidateInput
): Promise<Candidate> {
  const result = await prisma.candidate.create({ data });
  return result;
}

export async function getCandidateById(id: string): Promise<Candidate | null> {
  return prisma.candidate.findUnique({ where: { id } });
}

export async function getCandidateByEmail(
  email: string
): Promise<Candidate | null> {
  return prisma.candidate.findUnique({ where: { email } });
}

export async function getAllCandidates(query: QueryCandidateInput): Promise<{
  data: Candidate[];
  total: number;
  limit: number;
  offset: number;
}> {
  const { search, limit, offset } = query;
  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [data, total] = await Promise.all([
    prisma.candidate.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: { createdAt: "desc" },
    }),
    prisma.candidate.count({ where }),
  ]);

  return { data, total, limit, offset };
}

export async function updateCandidate(
  id: string,
  data: UpdateCandidateInput
): Promise<Candidate | null> {
  const exists = await prisma.candidate.findUnique({ where: { id } });
  if (!exists) {
    return null;
  }

  return prisma.candidate.update({ where: { id }, data });
}

export async function deleteCandidate(id: string): Promise<Candidate | null> {
  const exists = await prisma.candidate.findUnique({ where: { id } });
  if (!exists) {
    return null;
  }

  return prisma.candidate.delete({ where: { id } });
}
