import { PASSAGES } from './corpus';
import { createVectorIndex } from './main';
import type { SearchOptions } from './main';

const index = createVectorIndex();

function ask(query: string, options: SearchOptions = {}) {
  const results = index.search(query, options);
  const filter = options.filter ? ` filter ${JSON.stringify(options.filter)}` : '';
  console.log(`\n"${query}"${filter}`);
  if (results.length === 0) {
    console.log('  no passage above the threshold: answer "I could not find this in the handbook"');
  }
  for (const result of results) {
    console.log(`  ${result.score.toFixed(3)}  ${result.id} (${result.metadata.product}, ${result.metadata.plan})`);
  }
}

function main() {
  index.add(PASSAGES);
  console.log(`Indexed ${index.count()} handbook passages`);
  ask('How long do refunds take to reach my card?');
  ask('How do I enable single sign-on?', { topK: 2, filter: { plan: ['scale'] } });
  ask('zebra quantum banana', { topK: 3 });
  ask('zebra quantum banana', { topK: 3, minScore: 0.35 });
  index.add([{ id: 'billing-refund-timing', text: 'Refunds now reach the original card within 3 business days.', metadata: { product: 'billing', plan: 'all', updated: '2026-10-20' } }]);
  console.log('\nUpdated billing-refund-timing (same id, new text, re-embedded)');
  ask('How long do refunds take to reach my card?', { topK: 1 });
}

main();
