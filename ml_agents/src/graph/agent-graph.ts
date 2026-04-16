import { END, START, Annotation, StateGraph } from "@langchain/langgraph";

const GraphState = Annotation.Root({
  input: Annotation<string>({
    reducer: (_prev, next) => next,
    default: () => ""
  }),
  output: Annotation<string>({
    reducer: (_prev, next) => next,
    default: () => ""
  })
});

const graphBuilder = new StateGraph(GraphState).addNode("respond", async (state) => {
  return {
    output: `Agent reply: ${state.input}`
  };
});

graphBuilder.addEdge(START, "respond");
graphBuilder.addEdge("respond", END);

export const agentGraph = graphBuilder.compile();
