export const MOCK_GRAPH_DATA = {
  nodes: [
    { id: "n1", label: "Linux Kernel", group: "core" },
    { id: "n2", label: "Graph RAG", group: "ai" },
    { id: "n3", label: "React Pattern", group: "frontend" },
  ],
  edges: [
    { source: "n1", target: "n2" },
    { source: "n2", target: "n3" },
  ],
};
