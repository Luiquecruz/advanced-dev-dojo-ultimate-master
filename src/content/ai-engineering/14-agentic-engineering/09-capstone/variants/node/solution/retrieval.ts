import { cosineSimilarity, embed } from '@dojo/ai';
import type { HelpDocument } from './briefing';

export interface SearchHit {
  id: string;
  title: string;
  text: string;
  score: number;
}

export interface SearchOptions {
  topK?: number;
  minScore?: number;
}

export interface Retriever {
  search(query: string, options?: SearchOptions): SearchHit[];
}

export function createRetriever(documents: HelpDocument[]): Retriever {
  const vectors = embed(documents.map((document) => `${document.title}\n${document.text}`));
  return {
    search(query, { topK = 3, minScore = 0.1 } = {}) {
      const queryVector = embed(query);
      return documents
        .map((document, index) => ({ id: document.id, title: document.title, text: document.text, score: cosineSimilarity(queryVector, vectors[index]) }))
        .filter((hit) => hit.score >= minScore)
        .sort((left, right) => right.score - left.score || left.id.localeCompare(right.id))
        .slice(0, topK);
    },
  };
}
