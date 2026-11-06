export interface VectorItem {
  id: string;
  vector: number[];
}

const dot = (a: number[], b: number[]) => a.reduce((sum, value, index) => sum + value * b[index], 0);
const norm = (a: number[]) => Math.sqrt(dot(a, a));

export function cosineSimilarity(a: number[], b: number[]): number {
  const lengths = norm(a) * norm(b);
  return lengths === 0 ? 0 : dot(a, b) / lengths;
}

export function exactSearch(items: VectorItem[], query: number[], k: number): string[] {
  return items
    .map((item) => ({ id: item.id, score: cosineSimilarity(item.vector, query) }))
    .sort((left, right) => right.score - left.score || (left.id < right.id ? -1 : left.id > right.id ? 1 : 0))
    .slice(0, k)
    .map((entry) => entry.id);
}

function rankCentroids(centroids: number[][], vector: number[]): number[] {
  return centroids
    .map((centroid, index) => ({ index, score: cosineSimilarity(centroid, vector) }))
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .map((entry) => entry.index);
}

export function createIvfIndex(centroids: number[][]) {
  const lists: VectorItem[][] = centroids.map(() => []);

  function add(id: string, vector: number[]): void {
    lists[rankCentroids(centroids, vector)[0]].push({ id, vector });
  }

  function listSizes(): number[] {
    return lists.map((list) => list.length);
  }

  function search(query: number[], k: number, nprobe: number): string[] {
    const probed = rankCentroids(centroids, query).slice(0, nprobe);
    return exactSearch(probed.flatMap((index) => lists[index]), query, k);
  }

  return { add, listSizes, search };
}

const items: VectorItem[] = [
  { id: 'cats', vector: [0.9, 0.1, 0] },
  { id: 'dogs', vector: [0.7, 0.3, 0] },
  { id: 'taxes', vector: [0, 0.1, 0.9] },
];
console.log(exactSearch(items, [1, 0, 0], 2));
