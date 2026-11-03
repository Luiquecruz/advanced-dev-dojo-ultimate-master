import { cosineSimilarity, embed } from '@dojo/ai';

export function createVectorSearch(documents: Array<{ id: string; text: string }>) {
  const vectors = embed(documents.map((document) => document.text));
  return (query: string, limit: number) => {
    const queryVector = embed(query);
    return documents
      .map((document, index) => ({ ...document, score: cosineSimilarity(queryVector, vectors[index]) }))
      .sort((left, right) => right.score - left.score)
      .slice(0, limit);
  };
}
