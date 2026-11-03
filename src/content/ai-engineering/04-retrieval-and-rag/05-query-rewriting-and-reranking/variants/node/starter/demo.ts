import { createModel } from '@dojo/ai';
import { fakeModel, respond } from '@dojo/ai/testing';
import { PASSAGES } from './corpus';
import { generateQueries, hydeQuery, rerank } from './main';
import { createVectorSearch } from './vector';

const search = createVectorSearch(PASSAGES);
const model = createModel();

async function main() {
  const question = 'money back?';
  fakeModel.reply(
    respond.json({ queries: ['refund policy for annual plans', 'how long do refunds take to reach the card', 'Money back?'] }),
    respond.text('Refunds for annual plans are paid within 30 days of purchase and reach the original card within 5 to 10 business days.'),
  );

  console.log(`Question: "${question}"`);
  console.log(`  plain search: ${search(question, 3).map((passage) => passage.id).join(', ')}`);
  const queries = await generateQueries(model, question);
  console.log(`  multi-query:  ${queries.map((query) => `"${query}"`).join(' | ')}`);
  const pooled = new Map<string, { id: string; text: string }>();
  queries.forEach((query) => search(query, 3).forEach((passage) => pooled.set(passage.id, passage)));
  console.log(`  pooled candidates: ${[...pooled.keys()].join(', ')}`);
  const hyde = await hydeQuery(model, question);
  console.log(`  HyDE search:  ${search(hyde, 3).map((passage) => passage.id).join(', ')}`);

  const candidates = [...pooled.values()];
  fakeModel.reply(
    respond.malformedJson({ scores: [{ id: 'billing-refund-timing', score: 9 }, { id: 'billing-refund-window', score: 8 }, { id: 'billing-seats', score: 2 }] }),
    respond.json({ scores: [{ id: 'billing-refund-timing', score: 9 }, { id: 'billing-refund-window', score: 8 }, { id: 'billing-seats', score: 'n/a' }, { id: 'invented-doc', score: 10 }] }),
    respond.error(503),
  );
  for (const attempt of ['malformed reply', 'partial scores', 'provider down']) {
    const { results, reranked } = await rerank(model, question, candidates, { topK: 3 });
    const order = results.map((result) => `${result.id}${result.score === null ? '' : ` (${result.score})`}`).join(', ');
    console.log(`  rerank, ${attempt}: ${reranked ? 'reranked' : 'kept retrieval order'} -> ${order}`);
  }
}

main().catch((error) => console.error(`demo failed: ${error.message}`));
