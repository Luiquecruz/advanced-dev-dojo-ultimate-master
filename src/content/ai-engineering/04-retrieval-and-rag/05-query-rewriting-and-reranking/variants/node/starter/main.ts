import type { GenerateRequest, GenerateResponse } from '@dojo/ai';

export interface ChatModel {
  generate(request: GenerateRequest): Promise<GenerateResponse>;
}

export interface Candidate {
  id: string;
  text: string;
}

export interface RerankedCandidate extends Candidate {
  score: number | null;
}

export interface RerankResult {
  results: RerankedCandidate[];
  reranked: boolean;
}

export function parseJsonLoosely(text: string): unknown {
  // TODO: try JSON.parse on the text, on a fenced block and on the span from the first { to the last }; repair single quotes and trailing commas
  return JSON.parse(text);
}

export async function generateQueries(model: ChatModel, question: string, { count = 3 }: { count?: number } = {}): Promise<string[]> {
  // TODO: ask for {"queries": [...]} as JSON, keep the original question first, dedupe, cap at count + 1, fall back to [question]
  throw new Error('Not implemented');
}

export async function hydeQuery(model: ChatModel, question: string): Promise<string> {
  // TODO: ask for a hypothetical answer passage and return question + blank line + passage, or the question alone when there is none
  throw new Error('Not implemented');
}

export async function rerank(model: ChatModel, query: string, candidates: Candidate[], { topK = candidates.length }: { topK?: number } = {}): Promise<RerankResult> {
  // TODO: one JSON request with the query and every candidate, keep valid scores only, scored candidates first, retrieval order as the fallback
  return { results: candidates.slice(0, topK).map((candidate) => ({ ...candidate, score: null })), reranked: false };
}
