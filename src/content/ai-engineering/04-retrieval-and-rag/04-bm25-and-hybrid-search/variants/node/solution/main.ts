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
  const termCounts = documents.map((document) => {
    const counts = new Map<string, number>();
    tokenize(document.text).forEach((token) => counts.set(token, (counts.get(token) ?? 0) + 1));
    return counts;
  });
  const lengths = documents.map((document) => tokenize(document.text).length);
  const averageLength = lengths.reduce((total, length) => total + length, 0) / Math.max(documents.length, 1);
  const documentFrequency = new Map<string, number>();
  termCounts.forEach((counts) => counts.forEach((_, token) => documentFrequency.set(token, (documentFrequency.get(token) ?? 0) + 1)));

  function inverseDocumentFrequency(token: string): number {
    const containing = documentFrequency.get(token) ?? 0;
    return Math.log(1 + (documents.length - containing + 0.5) / (containing + 0.5));
  }

  function scoreAt(queryTokens: string[], index: number): number {
    const lengthNormalization = 1 - b + (b * lengths[index]) / averageLength;
    return queryTokens.reduce((total, token) => {
      const frequency = termCounts[index].get(token) ?? 0;
      return total + (inverseDocumentFrequency(token) * frequency * (k1 + 1)) / (frequency + k1 * lengthNormalization);
    }, 0);
  }

  return {
    idf(term: string): number {
      return inverseDocumentFrequency(tokenize(term)[0]);
    },
    score(query: string, id: string): number {
      return scoreAt([...new Set(tokenize(query))], documents.findIndex((document) => document.id === id));
    },
    search(query: string, topK = 10): RankedId[] {
      const queryTokens = [...new Set(tokenize(query))];
      return documents
        .map((document, index) => ({ id: document.id, score: scoreAt(queryTokens, index) }))
        .filter((result) => result.score > 0)
        .sort((left, right) => right.score - left.score)
        .slice(0, topK);
    },
  };
}

export function reciprocalRankFusion(rankings: string[][], { k = 60, topK = Infinity }: { k?: number; topK?: number } = {}): RankedId[] {
  const scores = new Map<string, number>();
  for (const ranking of rankings) {
    const seen = new Set<string>();
    ranking.forEach((id, position) => {
      if (seen.has(id)) {
        return;
      }
      seen.add(id);
      scores.set(id, (scores.get(id) ?? 0) + 1 / (k + position + 1));
    });
  }
  return [...scores.entries()]
    .map(([id, score]) => ({ id, score }))
    .sort((left, right) => right.score - left.score)
    .slice(0, topK);
}

export async function hybridSearch(query: string, retrievers: Retriever[], { candidates = 20, topK = 5, k = 60 }: { candidates?: number; topK?: number; k?: number } = {}): Promise<RankedId[]> {
  const outcomes = await Promise.allSettled(retrievers.map(async (retriever) => retriever(query, candidates)));
  const rankings = outcomes.filter((outcome) => outcome.status === 'fulfilled').map((outcome) => outcome.value);
  if (rankings.length === 0) {
    throw new Error('Every retriever failed', { cause: outcomes.map((outcome) => (outcome.status === 'rejected' ? outcome.reason : undefined)) });
  }
  return reciprocalRankFusion(rankings, { k, topK });
}
