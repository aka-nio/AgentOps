import * as candidateService from "../services/candidate.service.js";

export const listCandidates = (query: unknown) =>
  candidateService.listCandidates(query);

export const getCandidate = (id: string) => candidateService.getCandidate(id);

export const createCandidate = (body: unknown) =>
  candidateService.createNewCandidate(body);

export const updateCandidate = (id: string, body: unknown) =>
  candidateService.editCandidate(id, body);

export const deleteCandidate = (id: string) =>
  candidateService.removeCandidate(id);
