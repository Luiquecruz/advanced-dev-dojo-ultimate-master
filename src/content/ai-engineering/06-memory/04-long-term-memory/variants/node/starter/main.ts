import { cosineSimilarity, embed } from '@dojo/ai';
import type { GenerateRequest, GenerateResponse } from '@dojo/ai';

export interface ChatModel {
  generate(request: GenerateRequest): Promise<GenerateResponse>;
}

export interface Candidate {
  text: string;
  importance: number;
}

export interface Memory {
  id: string;
  text: string;
  importance: number;
  embedding: number[];
  createdAt: number;
  lastAccessedAt: number;
}

export interface RetrievalWeights {
  relevance: number;
  recency: number;
  importance: number;
}

export interface MemoryStoreOptions {
  now?: () => number;
  minImportance?: number;
  duplicateThreshold?: number;
  decayPerHour?: number;
  weights?: RetrievalWeights;
}

export interface WriteResult {
  action: 'added' | 'merged' | 'skipped';
  memory?: Memory;
}

export interface ScoredMemory {
  memory: Memory;
  score: number;
  relevance: number;
  recency: number;
  importance: number;
}

const HOUR_MS = 3_600_000;

const EXTRACTION_PROMPT =
  'Extract facts about the user worth remembering in future conversations: stable preferences, personal facts, commitments. Skip small talk and one-off requests. Answer only with JSON: {"memories":[{"text":"...","importance":1-10}]}.';

export async function extractCandidates(model: ChatModel, conversation: string): Promise<Candidate[]> {
  // TODO: ask for JSON, then keep only items with a non-empty text and an integer importance from 1 to 10; [] for refusals and malformed JSON
  const response = await model.generate({ messages: [{ role: 'system', content: EXTRACTION_PROMPT }, { role: 'user', content: conversation }] });
  return JSON.parse(response.text).memories;
}

export function isWorthStoring(candidate: Candidate, minImportance = 3): boolean {
  // TODO: importance at least minImportance, at least three words, not a question
  return true;
}

export function recencyScore(lastAccessedAt: number, now: number, decayPerHour: number): number {
  // TODO: decayPerHour raised to the hours since lastAccessedAt (never more than 1)
  return 1;
}

export function createMemoryStore({
  now = Date.now,
  minImportance = 3,
  duplicateThreshold = 0.9,
  decayPerHour = 0.995,
  weights = { relevance: 1, recency: 1, importance: 1 },
}: MemoryStoreOptions = {}) {
  const memories: Memory[] = [];
  let created = 0;

  const copy = (memory: Memory): Memory => ({ ...memory, embedding: [...memory.embedding] });

  return {
    write(candidate: Candidate): WriteResult {
      // TODO: skip what is not worth storing, merge into the most similar memory at or above duplicateThreshold, otherwise add
      const time = now();
      const memory: Memory = { id: `memory-${++created}`, text: candidate.text, importance: candidate.importance, embedding: embed(candidate.text), createdAt: time, lastAccessedAt: time };
      memories.push(memory);
      return { action: 'added', memory: copy(memory) };
    },
    retrieve(query: string, limit = 5): ScoredMemory[] {
      // TODO: score = weighted relevance + recency + importance / 10, best first, and mark the returned memories as accessed now
      const queryEmbedding = embed(query);
      return memories
        .map((memory) => {
          const relevance = cosineSimilarity(queryEmbedding, memory.embedding);
          return { memory: copy(memory), score: relevance, relevance, recency: 1, importance: memory.importance / 10 };
        })
        .sort((left, right) => right.score - left.score)
        .slice(0, limit);
    },
    all(): Memory[] {
      return memories.map(copy);
    },
  };
}
