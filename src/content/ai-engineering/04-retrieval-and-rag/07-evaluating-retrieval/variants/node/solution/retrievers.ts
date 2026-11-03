import { cosineSimilarity, embed } from '@dojo/ai';

type Document = { id: string; text: string };

const STOPWORDS = new Set(['a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'can', 'do', 'for', 'from', 'how', 'i', 'in', 'is', 'it', 'my', 'of', 'on', 'or', 'that', 'the', 'this', 'to', 'was', 'what', 'when', 'where', 'which', 'who', 'why', 'with']);

function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).filter((word) => !STOPWORDS.has(word)).map((word) => word.replace(/(ing|ed|es|s)$/, '') || word);
}

export function createBm25Retriever(documents: Document[], k1 = 1.2, b = 0.75) {
  const tokens = documents.map((document) => tokenize(document.text));
  const averageLength = tokens.reduce((total, list) => total + list.length, 0) / documents.length;
  const idf = (token: string) => {
    const containing = tokens.filter((list) => list.includes(token)).length;
    return Math.log(1 + (documents.length - containing + 0.5) / (containing + 0.5));
  };
  return (query: string, limit: number): string[] => {
    const queryTokens = [...new Set(tokenize(query))];
    return documents
      .map((document, index) => {
        const normalization = 1 - b + (b * tokens[index].length) / averageLength;
        const score = queryTokens.reduce((total, token) => {
          const frequency = tokens[index].filter((candidate) => candidate === token).length;
          return total + (idf(token) * frequency * (k1 + 1)) / (frequency + k1 * normalization);
        }, 0);
        return { id: document.id, score };
      })
      .filter((result) => result.score > 0)
      .sort((left, right) => right.score - left.score)
      .slice(0, limit)
      .map((result) => result.id);
  };
}

export function createVectorRetriever(documents: Document[]) {
  const vectors = embed(documents.map((document) => document.text));
  return (query: string, limit: number): string[] => {
    const queryVector = embed(query);
    return documents
      .map((document, index) => ({ id: document.id, score: cosineSimilarity(queryVector, vectors[index]) }))
      .sort((left, right) => right.score - left.score)
      .slice(0, limit)
      .map((result) => result.id);
  };
}

export function createHybridRetriever(retrievers: Array<(query: string, limit: number) => string[]>, candidates = 20, rankConstant = 60) {
  return (query: string, limit: number): string[] => {
    const scores = new Map<string, number>();
    retrievers.forEach((retrieve) => retrieve(query, candidates).forEach((id, position) => scores.set(id, (scores.get(id) ?? 0) + 1 / (rankConstant + position + 1))));
    return [...scores.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, limit)
      .map(([id]) => id);
  };
}
