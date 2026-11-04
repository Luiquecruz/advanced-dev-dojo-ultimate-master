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
  // TODO: embed every document once ("<title>\n<text>"), then rank by cosine similarity to the query, drop scores below minScore, keep topK
  return {
    search(query, { topK = 3 } = {}) {
      return documents.slice(0, topK).map((document) => ({ id: document.id, title: document.title, text: document.text, score: 0 }));
    },
  };
}
