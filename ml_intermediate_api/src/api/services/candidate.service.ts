import {
  createCandidateSchema,
  queryCandidateSchema,
  updateCandidateSchema,
} from "../../db_operations/db_types/candidate.schema.js";
import {
  createCandidate,
  deleteCandidate,
  getAllCandidates,
  getCandidateByEmail,
  getCandidateById,
  updateCandidate,
} from "../../db_operations/models/candidate.model.js";

export async function listCandidates(rawQuery: unknown) {
  const query = queryCandidateSchema.parse(rawQuery);
  return getAllCandidates(query);
}

export async function getCandidate(id: string) {
  const candidate = await getCandidateById(id);
  if (!candidate) {
    throw new Error("Candidate not found");
  }

  return candidate;
}

export async function createNewCandidate(rawBody: unknown) {
  const body = createCandidateSchema.parse(rawBody);
  const existingCandidate = await getCandidateByEmail(body.email);

  if (existingCandidate) {
    throw new Error("Candidate already exists");
  }

  return createCandidate(body);
}

export async function editCandidate(id: string, rawBody: unknown) {
  const body = updateCandidateSchema.parse(rawBody);

  if (body.email) {
    const existingCandidate = await getCandidateByEmail(body.email);
    if (existingCandidate && existingCandidate.id !== id) {
      throw new Error("Candidate already exists");
    }
  }

  const candidate = await updateCandidate(id, body);
  if (!candidate) {
    throw new Error("Candidate not found");
  }

  return candidate;
}

export async function removeCandidate(id: string) {
  const candidate = await deleteCandidate(id);
  if (!candidate) {
    throw new Error("Candidate not found");
  }

  return candidate;
}
