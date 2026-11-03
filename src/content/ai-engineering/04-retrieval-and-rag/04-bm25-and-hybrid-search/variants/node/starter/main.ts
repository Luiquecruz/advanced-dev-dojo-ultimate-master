export const STOPWORDS = new Set(['a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'can', 'do', 'for', 'from', 'how', 'i', 'in', 'is', 'it', 'my', 'of', 'on', 'or', 'that', 'the', 'this', 'to', 'was', 'what', 'when', 'where', 'which', 'who', 'why', 'with']);

export function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).filter((word) => !STOPWORDS.has(word)).map((word) => word.replace(/(ing|ed|es|s)$/, '') || word);
}

export interface Bm25Document {
  id: string;
  text: string;
}

export interface Bm25Options {
  k1?: number;
  b?: number;
}

export interface RankedId {
  id: string;
  score: number;
}

export type Retriever = (query: string, limit: number) => string[] | Promise<string[]>;

export function createBm25Index(documents: Bm25Document[], { k1 = 1.2, b = 0.75 }: Bm25Options = {}) {
  // TODO: precompute term counts per document, document lengths, the average length and document frequencies

  return {
    idf(term: string): number {
      // TODO: ln(1 + (N - n + 0.5) / (n + 0.5)) for the first token of term
      throw new Error('Not implemented');
    },
    score(query: string, id: string): number {
      // TODO: sum idf x saturated, length-normalized term frequency over the unique query tokens
      throw new Error('Not implemented');
    },
    search(query: string, topK = 10): RankedId[] {
      // TODO: score every document, keep scores above 0, sort from highest to lowest, take topK
      throw new Error('Not implemented');
    },
  };
}

export function reciprocalRankFusion(rankings: string[][], { k = 60, topK = Infinity }: { k?: number; topK?: number } = {}): RankedId[] {
  // TODO: add 1 / (k + rank) for the first position of each id in each ranking, then sort
  throw new Error('Not implemented');
}

export async function hybridSearch(query: string, retrievers: Retriever[], { candidates = 20, topK = 5, k = 60 }: { candidates?: number; topK?: number; k?: number } = {}): Promise<RankedId[]> {
  // TODO: ask every retriever for `candidates` ids, skip the ones that fail (throw if all fail), fuse with reciprocalRankFusion
  throw new Error('Not implemented');
}
