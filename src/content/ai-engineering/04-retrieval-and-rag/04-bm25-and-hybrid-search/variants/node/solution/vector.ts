import { cosineSimilarity, embed } from '@dojo/ai';

export function createVectorRetriever(documents: Array<{ id: string; text: string }>) {
  const vectors = embed(documents.map((document) => document.text));
  return (query: string, limit: number): string[] => {
    const queryVector = embed(query);
    return documents
      .map((document, index) => ({ id: document.id, score: cosineSimilarity(queryVector, vectors[index]) }))
      .filter((result) => result.score > 0)
      .sort((left, right) => right.score - left.score)
      .slice(0, limit)
      .map((result) => result.id);
  };
}
