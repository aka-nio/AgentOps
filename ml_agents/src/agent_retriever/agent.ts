import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ChatOpenAI } from "@langchain/openai";
import { fetch_ml_questions } from "./tools.js";
import type { MercadoLivreQuestion } from "./types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type DraftedAnswer = {
  question: MercadoLivreQuestion;
  answer: string;
};

const buildPrompt = (rules: string, question: MercadoLivreQuestion): string => {
  return [
    "You are agent_retriever.",
    "",
    "Follow these rules:",
    rules.trim(),
    "",
    "Task:",
    "Draft a suggested seller reply to the Mercado Livre customer question below.",
    "Return ONLY the final answer text (no headings, no markdown fences).",
    "",
    "Question:",
    `- id: ${question.id}`,
    `- item_id: ${question.item_id}`,
    `- status: ${question.status}`,
    `- text: ${question.text || "(empty)"}`,
    `- date_created: ${question.date_created}`
  ].join("\n");
};

const draftAnswer = async (question: MercadoLivreQuestion, rules: string): Promise<DraftedAnswer> => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required to draft answers.");
  }

  const model = new ChatOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    model: "gpt-4o-mini",
    temperature: 0.4
  });

  const prompt = buildPrompt(rules, question);
  const result = await model.invoke(prompt);
  const content = typeof result.content === "string" ? result.content : JSON.stringify(result.content);

  return {
    question,
    answer: content.trim()
  };
};

const renderMarkdown = ({ question, answer }: DraftedAnswer): string => {
  return [
    "## Question",
    "",
    `- **id**: ${question.id}`,
    `- **item_id**: ${question.item_id}`,
    `- **seller_id**: ${question.seller_id}`,
    `- **status**: ${question.status}`,
    `- **date_created**: ${question.date_created}`,
    "",
    "### Text",
    "",
    question.text?.length ? question.text : "(empty)",
    "",
    "## Suggested answer",
    "",
    answer,
    ""
  ].join("\n");
};

export type RunAgentRetrieverOptions = {
  limit?: number;
  dryRun?: boolean;
};

export const runAgentRetriever = async (options: RunAgentRetrieverOptions = {}): Promise<void> => {
  const rulesPath = path.join(__dirname, "RULES.md");
  const rules = await readFile(rulesPath, "utf8");

  const response = await fetch_ml_questions.invoke({ status: "UNANSWERED" });
  const unanswered = response.questions.filter((q) => q.status === "UNANSWERED");
  const selected = typeof options.limit === "number" ? unanswered.slice(0, options.limit) : unanswered;

  if (options.dryRun) {
    console.log(`[agent_retriever] dry-run: would draft ${selected.length} answers`);
    console.log(
      selected.map((q) => `- ${q.id} (${q.item_id}) ${q.text?.slice(0, 60) ?? ""}`).join("\n")
    );
    return;
  }

  const outDir = path.join(__dirname, "outputs");
  await mkdir(outDir, { recursive: true });

  for (const question of selected) {
    const drafted = await draftAnswer(question, rules);
    const md = renderMarkdown(drafted);
    const outPath = path.join(outDir, `${question.id}.md`);
    await writeFile(outPath, md, "utf8");
    console.log(`[agent_retriever] wrote ${outPath}`);
  }
};
