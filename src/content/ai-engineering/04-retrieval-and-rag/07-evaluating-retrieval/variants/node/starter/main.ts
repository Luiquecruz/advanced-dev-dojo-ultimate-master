export type Relevance = Record<string, number>;
export type Retriever = (query: string, limit: number) => string[] | Promise<string[]>;

export interface GoldenItem {
  query: string;
  relevance: Relevance;
}

export interface QueryResult {
  query: string;
  retrieved: string[];
  recall: number;
  reciprocalRank: number;
  ndcg: number;
}

export interface RetrievalReport {
  k: number;
  recallAtK: number;
  mrr: number;
  ndcgAtK: number;
  perQuery: QueryResult[];
}

export function recallAtK(retrieved: string[], relevant: string[], k: number): number {
  // TODO: share of relevant ids among the first k unique retrieved ids; throw when relevant is empty
  throw new Error('Not implemented');
}

export function reciprocalRank(retrieved: string[], relevant: string[]): number {
  // TODO: 1 / position of the first relevant id among the unique retrieved ids, or 0
  throw new Error('Not implemented');
}

export function ndcgAtK(retrieved: string[], relevance: Relevance, k: number): number {
  // TODO: DCG of the first k unique ids divided by the DCG of the ideal ordering of the grades
  throw new Error('Not implemented');
}

export async function evaluateRetriever(retrieve: Retriever, goldenSet: GoldenItem[], { k = 5 }: { k?: number } = {}): Promise<RetrievalReport> {
  // TODO: call retrieve(query, k) for each golden item, score it, and average the three metrics
  throw new Error('Not implemented');
}

export async function compareRetrievers(retrievers: Record<string, Retriever>, goldenSet: GoldenItem[], options: { k?: number } = {}) {
  // TODO: evaluate every retriever and return { name, k, recallAtK, mrr, ndcgAtK } rows sorted by nDCG, best first
  throw new Error('Not implemented');
}
