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

function unique(ids: string[]): string[] {
  return [...new Set(ids)];
}

function mean(values: number[]): number {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function relevantIds(relevance: Relevance): string[] {
  return Object.keys(relevance).filter((id) => relevance[id] > 0);
}

export function recallAtK(retrieved: string[], relevant: string[], k: number): number {
  if (relevant.length === 0) {
    throw new Error('A golden item needs at least one relevant id');
  }
  const top = new Set(unique(retrieved).slice(0, k));
  return relevant.filter((id) => top.has(id)).length / relevant.length;
}

export function reciprocalRank(retrieved: string[], relevant: string[]): number {
  const position = unique(retrieved).findIndex((id) => relevant.includes(id));
  return position === -1 ? 0 : 1 / (position + 1);
}

function discountedGain(grades: number[]): number {
  return grades.reduce((total, grade, index) => total + (2 ** grade - 1) / Math.log2(index + 2), 0);
}

export function ndcgAtK(retrieved: string[], relevance: Relevance, k: number): number {
  const ideal = discountedGain(
    Object.values(relevance)
      .filter((grade) => grade > 0)
      .sort((left, right) => right - left)
      .slice(0, k),
  );
  if (ideal === 0) {
    return 0;
  }
  return discountedGain(unique(retrieved).slice(0, k).map((id) => relevance[id] ?? 0)) / ideal;
}

export async function evaluateRetriever(retrieve: Retriever, goldenSet: GoldenItem[], { k = 5 }: { k?: number } = {}): Promise<RetrievalReport> {
  const perQuery: QueryResult[] = [];
  for (const item of goldenSet) {
    const retrieved = await retrieve(item.query, k);
    const relevant = relevantIds(item.relevance);
    perQuery.push({
      query: item.query,
      retrieved,
      recall: recallAtK(retrieved, relevant, k),
      reciprocalRank: reciprocalRank(retrieved, relevant),
      ndcg: ndcgAtK(retrieved, item.relevance, k),
    });
  }
  return {
    k,
    recallAtK: mean(perQuery.map((result) => result.recall)),
    mrr: mean(perQuery.map((result) => result.reciprocalRank)),
    ndcgAtK: mean(perQuery.map((result) => result.ndcg)),
    perQuery,
  };
}

export async function compareRetrievers(retrievers: Record<string, Retriever>, goldenSet: GoldenItem[], options: { k?: number } = {}) {
  const rows = [];
  for (const [name, retrieve] of Object.entries(retrievers)) {
    const { k, recallAtK: recall, mrr, ndcgAtK: ndcg } = await evaluateRetriever(retrieve, goldenSet, options);
    rows.push({ name, k, recallAtK: recall, mrr, ndcgAtK: ndcg });
  }
  return rows.sort((left, right) => right.ndcgAtK - left.ndcgAtK);
}
