import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { withAgentRunLog } from "../lib/agent-run-log.js";
import { fetch_ml_questions } from "./tools/index.js";
import type { MercadoLivreQuestion } from "./types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type RetrieverPreparedPayload = {
  total: number;
  questions: MercadoLivreQuestion[];
};

export type RunAgentRetrieverOptions = {
  limit?: number;
  dryRun?: boolean;
};

export const runAgentRetriever = async (options: RunAgentRetrieverOptions = {}): Promise<void> => {
  await withAgentRunLog(
    "agent_retriever",
    { dryRun: Boolean(options.dryRun), limit: options.limit ?? null },
    async (log) => {
      const response = await fetch_ml_questions.invoke({ status: "UNANSWERED" });
      const unanswered = response.questions.filter((q) => q.status === "UNANSWERED");
      const selected = typeof options.limit === "number" ? unanswered.slice(0, options.limit) : unanswered;
      const payload: RetrieverPreparedPayload = {
        total: selected.length,
        questions: selected
      };

      if (options.dryRun) {
        console.log(`[agent_retriever] dry-run: would prepare ${selected.length} unanswered questions`);
        console.log(
          selected.map((q) => `- ${q.id} (${q.item_id}) ${q.text?.slice(0, 60) ?? ""}`).join("\n")
        );
        return;
      }

      const outPath = await log.withStep(
        "write_unanswered_payload",
        async () => {
          const outDir = path.join(__dirname, "outputs");
          await mkdir(outDir, { recursive: true });

          const targetPath = path.join(outDir, "unanswered-questions.json");
          await writeFile(targetPath, JSON.stringify(payload, null, 2), "utf8");
          return targetPath;
        },
        { questionCount: payload.total }
      );

      console.log(`[agent_retriever] prepared ${payload.total} unanswered questions at ${outPath}`);
    }
  );
};
