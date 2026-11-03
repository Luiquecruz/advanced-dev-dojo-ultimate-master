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

function isCandidate(value: unknown): value is Candidate {
  const item = value as Candidate;
  return typeof item?.text === 'string' && item.text.trim() !== '' && Number.isInteger(item.importance) && item.importance >= 1 && item.importance <= 10;
}

export async function extractCandidates(model: ChatModel, conversation: string): Promise<Candidate[]> {
  const response = await model.generate({
    messages: [
      { role: 'system', content: EXTRACTION_PROMPT },
      { role: 'user', content: conversation },
    ],
    responseFormat: { type: 'json' },
  });
  if (response.finishReason !== 'stop') {
    return [];
  }
  try {
    const memories = JSON.parse(response.text).memories;
    return Array.isArray(memories) ? memories.filter(isCandidate).map((item) => ({ text: item.text.trim(), importance: item.importance })) : [];
  } catch {
    return [];
  }
}

export function isWorthStoring(candidate: Candidate, minImportance = 3): boolean {
  const text = candidate.text.trim();
  return candidate.importance >= minImportance && text.split(/\s+/).length >= 3 && !text.endsWith('?');
}

export function recencyScore(lastAccessedAt: number, now: number, decayPerHour: number): number {
  return decayPerHour ** (Math.max(0, now - lastAccessedAt) / HOUR_MS);
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
      if (!isWorthStoring(candidate, minImportance)) {
        return { action: 'skipped' };
      }
      const text = candidate.text.trim();
      const embedding = embed(text);
      const time = now();
      let duplicate: Memory | undefined;
      let bestSimilarity = -Infinity;
      for (const memory of memories) {
        const similarity = cosineSimilarity(embedding, memory.embedding);
        if (similarity > bestSimilarity) {
          bestSimilarity = similarity;
          duplicate = memory;
        }
      }
      if (duplicate && bestSimilarity >= duplicateThreshold) {
        duplicate.text = text;
        duplicate.embedding = embedding;
        duplicate.importance = Math.max(duplicate.importance, candidate.importance);
        duplicate.lastAccessedAt = time;
        return { action: 'merged', memory: copy(duplicate) };
      }
      const memory: Memory = { id: `memory-${++created}`, text, importance: candidate.importance, embedding, createdAt: time, lastAccessedAt: time };
      memories.push(memory);
      return { action: 'added', memory: copy(memory) };
    },
    retrieve(query: string, limit = 5): ScoredMemory[] {
      const queryEmbedding = embed(query);
      const time = now();
      const ranked = memories
        .map((memory) => {
          const relevance = Math.max(0, cosineSimilarity(queryEmbedding, memory.embedding));
          const recency = recencyScore(memory.lastAccessedAt, time, decayPerHour);
          const importance = memory.importance / 10;
          const score = weights.relevance * relevance + weights.recency * recency + weights.importance * importance;
          return { memory, score, relevance, recency, importance };
        })
        .sort((left, right) => right.score - left.score)
        .slice(0, limit);
      const results = ranked.map((entry) => ({ ...entry, memory: copy(entry.memory) }));
      ranked.forEach((entry) => {
        entry.memory.lastAccessedAt = time;
      });
      return results;
    },
    all(): Memory[] {
      return memories.map(copy);
    },
  };
}
