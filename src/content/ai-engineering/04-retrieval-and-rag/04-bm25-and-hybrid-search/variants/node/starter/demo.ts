import { PASSAGES } from './corpus';
import { createBm25Index, hybridSearch } from './main';
import { createVectorRetriever } from './vector';

const bm25 = createBm25Index(PASSAGES);
const keywordRetriever = (query: string, limit: number) => bm25.search(query, limit).map((result) => result.id);
const vectorRetriever = createVectorRetriever(PASSAGES);

async function compare(query: string) {
  console.log(`\n"${query}"`);
  console.log(`  BM25:   ${keywordRetriever(query, 3).join(', ') || '(nothing)'}`);
  console.log(`  vector: ${vectorRetriever(query, 3).join(', ') || '(nothing)'}`);
  const fused = await hybridSearch(query, [keywordRetriever, vectorRetriever], { topK: 3 });
  console.log(`  hybrid: ${fused.map((result) => `${result.id} (${result.score.toFixed(4)})`).join(', ')}`);
}

async function main() {
  console.log(`idf("plan") = ${bm25.idf('plan').toFixed(3)}  (common word)`);
  console.log(`idf("4012") = ${bm25.idf('4012').toFixed(3)}  (rare code)`);
  await compare('error E-4012 when verifying forwarding');
  await compare('How long do refunds take to reach my card?');
  await compare('two-factor login for agents');
  const offline = async () => {
    throw new Error('keyword index offline');
  };
  const degraded = await hybridSearch('single sign-on', [offline, vectorRetriever], { topK: 2 });
  console.log(`\nKeyword index offline, hybrid still answers from vectors: ${degraded.map((result) => result.id).join(', ')}`);
}

main().catch((error) => console.error(`demo failed: ${error.message}`));
