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
  // TODO: dot product divided by the product of the two lengths; 0 when a length is 0; throw when dimensions differ
  throw new Error('Not implemented');
}

export function matchesFilter(metadata: Metadata, filter: Filter = {}): boolean {
  // TODO: every filter key must exist in metadata and equal the value (or be one of the values when it is a list)
  throw new Error('Not implemented');
}

export function createVectorIndex({ embedder = (texts: string[]) => embed(texts) }: { embedder?: Embedder } = {}) {
  const records = new Map<string, StoredRecord>();

  return {
    add(batch: IndexRecord[]): void {
      // TODO: embed the whole batch in one call, reject vectors whose dimension differs from the index, upsert by id
      throw new Error('Not implemented');
    },
    remove(id: string): boolean {
      return records.delete(id);
    },
    count(): number {
      return records.size;
    },
    search(query: string, { topK = 3, filter, minScore = -Infinity }: SearchOptions = {}): SearchResult[] {
      // TODO: embed the query, keep records that match the filter, score them, drop scores below minScore, sort and take topK
      throw new Error('Not implemented');
    },
  };
}
