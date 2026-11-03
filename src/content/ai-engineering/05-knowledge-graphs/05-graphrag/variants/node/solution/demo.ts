import { createModel } from '@dojo/ai';
import { fakeModel, respond } from '@dojo/ai/testing';
import { answerGlobal, answerLocal, detectCommunities, routeQuestion, summarizeCommunities } from './main';
import type { EntityGraph } from './main';

const graph: EntityGraph = {
  entities: [
    { id: 'acme', name: 'Acme', type: 'Supplier', description: 'Metal parts supplier, single plant in Germany.' },
    { id: 'bolt', name: 'Bolt M4', type: 'Part', description: 'Steel bolt, single source.' },
    { id: 'hinge', name: 'Hinge', type: 'Part', description: 'Steel hinge.' },
    { id: 'kettle', name: 'Kettle', type: 'Product', description: 'Electric kettle, best seller.' },
    { id: 'toaster', name: 'Toaster', type: 'Product', description: 'Two-slot toaster.' },
    { id: 'globex', name: 'Globex', type: 'Supplier', description: 'Plastics supplier in Poland.' },
    { id: 'lid', name: 'Lid', type: 'Part', description: 'Plastic lid.' },
    { id: 'handle', name: 'Handle', type: 'Part', description: 'Plastic handle.' },
    { id: 'blender', name: 'Blender', type: 'Product', description: 'Countertop blender.' },
  ],
  relations: [
    { source: 'acme', target: 'bolt', type: 'SUPPLIES' },
    { source: 'acme', target: 'hinge', type: 'SUPPLIES' },
    { source: 'bolt', target: 'kettle', type: 'USED_IN' },
    { source: 'hinge', target: 'kettle', type: 'USED_IN' },
    { source: 'bolt', target: 'toaster', type: 'USED_IN' },
    { source: 'hinge', target: 'toaster', type: 'USED_IN' },
    { source: 'globex', target: 'lid', type: 'SUPPLIES' },
    { source: 'globex', target: 'handle', type: 'SUPPLIES' },
    { source: 'lid', target: 'blender', type: 'USED_IN' },
    { source: 'handle', target: 'blender', type: 'USED_IN' },
    { source: 'handle', target: 'kettle', type: 'USED_IN' },
  ],
};

async function main() {
  const model = createModel();
  const communities = detectCommunities(graph);
  console.log('Communities:');
  communities.forEach((community) => console.log(`  ${community.id}: ${community.members.join(', ')}`));

  fakeModel.reply(
    respond.json({ title: 'Steel parts from Acme', summary: 'Acme is the single source of bolts and hinges used in kettles and toasters.' }),
    respond.text('Plastics, mostly.'),
    respond.refusal(),
  );
  const reports = await summarizeCommunities(model, graph, communities);
  console.log('\nCommunity reports:');
  reports.forEach((report) => console.log(`  ${report.communityId}${report.fallback ? ' (fallback)' : ''}: ${report.title} - ${report.summary}`));

  const localQuestion = 'Which products use parts from Acme?';
  const localRoute = routeQuestion(localQuestion, graph);
  fakeModel.reply(respond.text('Kettles and toasters use Acme bolts and hinges.'));
  if (localRoute.mode === 'local') {
    const local = await answerLocal(model, localQuestion, graph, localRoute.entityIds, { hops: 2 });
    console.log(`\n[local] ${localQuestion}\n  context: ${local.entityIds.join(', ')}\n  answer: ${local.answer}`);
  }

  const globalQuestion = 'What are the main supply risks across the catalog?';
  console.log(`\n[${routeQuestion(globalQuestion, graph).mode}] ${globalQuestion}`);
  fakeModel.reply(
    respond.json({ points: [{ text: 'Acme is a single source for steel parts in two best sellers', score: 92 }, { text: 'Hinges are standard parts', score: 5 }] }),
    respond.json({ points: [{ text: 'Kettles also depend on Globex handles', score: 60 }] }),
    respond.text('The biggest risk is Acme as a single source for kettles and toasters; kettles also depend on Globex.'),
  );
  const global = await answerGlobal(model, globalQuestion, reports, { batchSize: 1, maxPoints: 2 });
  global.points.forEach((point) => console.log(`  point (${point.score}): ${point.text}`));
  console.log(`  answer: ${global.answer ?? 'not enough evidence'}`);
}

main().catch((error) => console.error(`demo failed: ${error.message}`));
