import { z } from "zod";
import { MercadoLivreQuestionSchema, type MercadoLivreQuestion } from "../agent_retriever/types.js";

export const PreparedQuestionsPayloadSchema = z.object({
  total: z.number().int().nonnegative(),
  questions: z.array(MercadoLivreQuestionSchema)
});

export type PreparedQuestionsPayload = z.infer<typeof PreparedQuestionsPayloadSchema>;

export type DraftedAnswer = {
  question: MercadoLivreQuestion;
  answer: string;
};

export type AnswerRunEntry = {
  question_id: number;
  item_id: string;
  status: MercadoLivreQuestion["status"];
  question_text: string;
  used_item_context: boolean;
  item_context_error?: string;
  handoff_reason?: string;
  answer: string;
};

export type AnswersRunLog = {
  run_at: string;
  source_payload_path: string;
  total_answers: number;
  answers: AnswerRunEntry[];
};

export type AnswersHistory = {
  runs: AnswersRunLog[];
};

export const ItemContextDecisionSchema = z.object({
  need_item: z.boolean(),
  reason: z.string().max(500)
});

export type ItemContextDecision = z.infer<typeof ItemContextDecisionSchema>;

export type DraftAnswerMeta = {
  used_item_context: boolean;
  item_context_error?: string;
  handoff_reason?: string;
};

export type RunAgentQuestionsOptions = {
  limit?: number;
  dryRun?: boolean;
  /** When set, skips reading a JSON file from disk (used by HTTP API and tests). */
  prepared?: PreparedQuestionsPayload;
  payloadPath?: string;
  /** When false, skips writing `outputs/answers-created.json` and history (default true). */
  persist?: boolean;
};

export type AgentQuestionsDryRunResult = {
  mode: "dry_run";
  source: "inline_payload" | "file";
  source_path?: string;
  total_unanswered: number;
  would_process: number;
  questions: Array<{
    id: number;
    item_id: string;
    status: MercadoLivreQuestion["status"];
    text_preview: string;
  }>;
};

export type AgentQuestionsCompletedResult = {
  mode: "completed";
  run: AnswersRunLog;
  persisted: boolean;
};

export type AgentQuestionsRunResult = AgentQuestionsDryRunResult | AgentQuestionsCompletedResult;
