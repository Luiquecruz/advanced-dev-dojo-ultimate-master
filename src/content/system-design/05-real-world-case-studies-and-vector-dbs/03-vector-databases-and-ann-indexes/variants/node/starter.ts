export interface VectorItem {
  id: string;
  vector: number[];
}

const dot = (a: number[], b: number[]) => a.reduce((sum, value, index) => sum + value * b[index], 0);

export function cosineSimilarity(a: number[], b: number[]): number {
  // TODO: divide by the product of both lengths, and return 0 when either length is zero
  return dot(a, b);
}

export function exactSearch(items: VectorItem[], query: number[], k: number): string[] {
  // TODO: break ties between equal similarities by id ascending
  return items
    .map((item) => ({ id: item.id, score: cosineSimilarity(item.vector, query) }))
    .sort((left, right) => right.score - left.score)
    .slice(0, k)
    .map((entry) => entry.id);
}

export function createIvfIndex(centroids: number[][]) {
  const lists: VectorItem[][] = centroids.map(() => []);

  function add(id: string, vector: number[]): void {
    // TODO: store the vector in the list of its most similar centroid
    lists[0].push({ id, vector });
  }

  function listSizes(): number[] {
    return lists.map((list) => list.length);
  }

  function search(query: number[], k: number, nprobe: number): string[] {
    // TODO: rank the centroids by similarity to the query and search only the first nprobe lists
    return exactSearch(lists.flat(), query, k);
  }

  return { add, listSizes, search };
}

const items: VectorItem[] = [
  { id: 'cats', vector: [0.9, 0.1, 0] },
  { id: 'dogs', vector: [0.7, 0.3, 0] },
  { id: 'taxes', vector: [0, 0.1, 0.9] },
];
console.log(exactSearch(items, [1, 0, 0], 2));
