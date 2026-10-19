// Kept as a stable import path for code written before the RAG service was
// consolidated. Both retrieval and grounding now share one implementation.
export { queryDocument, searchDocument } from "./ragService.js";
