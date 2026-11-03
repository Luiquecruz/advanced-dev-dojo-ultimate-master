import { PASSAGES } from './corpus';
import { GOLDEN_SET } from './golden';
import { compareRetrievers, evaluateRetriever } from './main';
import { createBm25Retriever, createHybridRetriever, createVectorRetriever } from './retrievers';

const percent = (value: number) => `${(value * 100).toFixed(1)}%`.padStart(7);

async function main() {
  const bm25 = createBm25Retriever(PASSAGES);
  const vector = createVectorRetriever(PASSAGES);
  const hybrid = createHybridRetriever([bm25, vector]);

  console.log(`Retrieval eval report: ${GOLDEN_SET.length} golden queries, ${PASSAGES.length} passages, k = 3\n`);
  console.log('retriever      recall@3      MRR   nDCG@3');
  for (const row of await compareRetrievers({ 'BM25 only': bm25, 'vector only': vector, hybrid }, GOLDEN_SET, { k: 3 })) {
    console.log(`${row.name.padEnd(12)} ${percent(row.recallAtK)}  ${percent(row.mrr)}  ${percent(row.ndcgAtK)}`);
  }
  console.log('\nDev Dojo embeddings are lexical, so BM25 is hard to beat here: the point is to measure on your corpus, not to assume hybrid always wins.');

  const report = await evaluateRetriever(hybrid, GOLDEN_SET, { k: 3 });
  const misses = report.perQuery.filter((result) => result.recall < 1);
  console.log(`\nHybrid queries that miss a relevant passage in the top 3 (${misses.length}):`);
  for (const miss of misses) {
    console.log(`  "${miss.query}" -> ${miss.retrieved.join(', ')} (recall ${percent(miss.recall).trim()})`);
  }
}

main().catch((error) => console.error(`demo failed: ${error.message}`));
