import { createModel } from '@dojo/ai';
import { fakeModel, respond } from '@dojo/ai/testing';
import { DOCUMENTS, PEOPLE } from './documents';
import { answerQuestion, createSecureIndex } from './main';
import type { Principal } from './main';

const index = createSecureIndex();
const model = createModel();

function searchAs(name: string, principal: Principal, query: string) {
  const results = index.search(principal, query, { topK: 3, minScore: 0.1 });
  console.log(`  ${name.padEnd(6)} (${principal.tenantId}, ${principal.groups.join('+')}): ${results.map((result) => result.id).join(', ') || '(nothing readable and relevant)'}`);
}

async function main() {
  DOCUMENTS.forEach((document) => index.upsert(document));
  console.log(`Indexed ${index.count()} documents for 2 tenants\n`);

  console.log('"salary bands for engineers"');
  for (const [name, principal] of Object.entries(PEOPLE)) {
    searchAs(name, principal, 'salary bands for engineers');
  }

  console.log('\nHR revokes engineering access to the incident review');
  searchAs('dana', PEOPLE.dana, 'October outage certificate');
  index.upsert({ ...DOCUMENTS[2], allowedGroups: ['security'] });
  searchAs('dana', PEOPLE.dana, 'October outage certificate');

  console.log("\nDana's review is deleted after the retention period");
  searchAs('maria', PEOPLE.maria, 'performance review Dana raise');
  index.remove('acme-performance-review-dana');
  searchAs('maria', PEOPLE.maria, 'performance review Dana raise');

  fakeModel.handle(() => respond.text('You get 25 days of paid leave a year, approved by your manager [1].'));
  const answer = await answerQuestion(model, index, PEOPLE.sam, 'How many leave days do I get, and what are the salary bands?');
  console.log(`\nSam asks about leave and salaries: ${answer.answer}`);
  console.log(`  sources sent to the model: ${answer.sourceIds.join(', ')}`);
  const prompt = fakeModel.requests[0].messages.map((message) => message.content).join('\n');
  const forbidden = DOCUMENTS.filter((document) => !answer.sourceIds.includes(document.id) && prompt.includes(document.text));
  console.log(`  documents Sam cannot read that reached the prompt: ${forbidden.length}`);
}

main().catch((error) => console.error(`demo failed: ${error.message}`));
