import { agentGraph } from "./agent-graph.js";

const input = process.argv.slice(2).join(" ").trim();

if (!input) {
  console.error('Usage: npm run orchestrator -- "<mensagem para o orquestrador>"');
  process.exit(1);
}

const state = await agentGraph.invoke({ input });

console.log(`route: ${state.orchestration.route}`);
console.log(`reason: ${state.orchestration.reason}`);
if (state.orchestration.limit !== undefined) {
  console.log(`limit: ${state.orchestration.limit}`);
}
if (state.orchestration.dry_run !== undefined) {
  console.log(`dry_run: ${state.orchestration.dry_run}`);
}
console.log("");
console.log(state.output);
