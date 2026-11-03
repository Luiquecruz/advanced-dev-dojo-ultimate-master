import { embed } from '@dojo/ai';

export type MetadataValue = string | number | boolean;
export type Metadata = Record<string, MetadataValue>;
export type Filter = Record<string, MetadataValue | MetadataValue[]>;
export type Embedder = (texts: string[]) => number[][];

export interface IndexRecord {
  id: string;
  text: string;
  metadata: Metadata;
}

export interface SearchResult extends IndexRecord {
  score: number;
}

export interface SearchOptions {
  topK?: number;
  filter?: Filter;
  minScore?: number;
}

interface StoredRecord extends IndexRecord {
  vector: number[];
}

export function similarity(left: number[], right: number[]): number {
  if (left.length !== right.length) {
    throw new Error(`Vectors have different dimensions: ${left.length} and ${right.length}`);
  }
  let dot = 0;
  let leftSquares = 0;
  let rightSquares = 0;
  for (let index = 0; index < left.length; index++) {
    dot += left[index] * right[index];
    leftSquares += left[index] * left[index];
    rightSquares += right[index] * right[index];
  }
  const norms = Math.sqrt(leftSquares) * Math.sqrt(rightSquares);
  return norms === 0 ? 0 : dot / norms;
}

export function matchesFilter(metadata: Metadata, filter: Filter = {}): boolean {
  return Object.entries(filter).every(([key, expected]) => {
    if (!(key in metadata)) {
      return false;
    }
    return Array.isArray(expected) ? expected.includes(metadata[key]) : metadata[key] === expected;
  });
}

export function createVectorIndex({ embedder = (texts: string[]) => embed(texts) }: { embedder?: Embedder } = {}) {
  const records = new Map<string, StoredRecord>();
  let dimensions: number | undefined;

  return {
    add(batch: IndexRecord[]): void {
      const vectors = embedder(batch.map((record) => record.text));
      const expected = dimensions ?? vectors[0]?.length;
      const mismatch = vectors.find((vector) => vector.length !== expected);
      if (mismatch) {
        throw new Error(`Embedding dimension mismatch: the index holds ${expected}-dimension vectors, got ${mismatch.length}`);
      }
      dimensions = expected;
      batch.forEach((record, index) => records.set(record.id, { ...record, vector: vectors[index] }));
    },
    remove(id: string): boolean {
      return records.delete(id);
    },
    count(): number {
      return records.size;
    },
    search(query: string, { topK = 3, filter, minScore = -Infinity }: SearchOptions = {}): SearchResult[] {
      const [queryVector] = embedder([query]);
      return [...records.values()]
        .filter((record) => matchesFilter(record.metadata, filter))
        .map(({ vector, ...record }) => ({ ...record, score: similarity(queryVector, vector) }))
        .filter((result) => result.score >= minScore)
        .sort((left, right) => right.score - left.score)
        .slice(0, topK);
    },
  };
}
