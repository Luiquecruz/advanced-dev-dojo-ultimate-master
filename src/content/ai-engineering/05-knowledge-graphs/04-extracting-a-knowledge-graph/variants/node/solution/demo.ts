import { createModel } from '@dojo/ai';
import { fakeModel, respond } from '@dojo/ai/testing';
import { buildKnowledgeGraph } from './main';
import type { ExtractionOntology } from './main';

const ontology: ExtractionOntology = {
  classes: ['Person', 'Organization', 'Product'],
  relations: [
    { name: 'worksFor', domain: 'Person', range: 'Organization' },
    { name: 'makes', domain: 'Organization', range: 'Product' },
    { name: 'acquired', domain: 'Organization', range: 'Organization' },
  ],
};

const documents = [
  { id: 'memo-1', text: 'Ana Souza leads research at Acme Corp. Acme makes the Roadrunner drone.' },
  { id: 'press-2', text: 'ACME Corporation acquired Globex Inc. and opened an office in Berlin.' },
  { id: 'blog-3', text: 'Ána Souza, from Acme, presented the Roadrunner 2 at a conference in Lisbon.' },
  { id: 'hr-4', text: 'Salary bands for every Acme employee.' },
];

async function main() {
  fakeModel.reply(
    respond.json({
      entities: [
        { name: 'Ana Souza', type: 'Person' },
        { name: 'Acme Corp', type: 'Organization', aliases: ['Acme'] },
        { name: 'Roadrunner', type: 'Product' },
      ],
      relations: [
        { source: 'Ana Souza', type: 'worksFor', target: 'Acme Corp' },
        { source: 'Acme', type: 'makes', target: 'Roadrunner' },
      ],
    }),
    respond.text("{'entities': [{'name': 'ACME Corporation'}"),
    respond.json({
      entities: [
        { name: 'ACME Corporation', type: 'Organization' },
        { name: 'Globex Inc.', type: 'Organization' },
        { name: 'Berlin', type: 'City' },
      ],
      relations: [
        { source: 'ACME Corporation', type: 'acquired', target: 'Globex Inc.' },
        { source: 'ACME Corporation', type: 'locatedIn', target: 'Berlin' },
      ],
    }),
    respond.json({
      entities: [
        { name: 'Ána Souza', type: 'Person' },
        { name: 'Acme', type: 'Organization' },
        { name: 'Roadrunner 2', type: 'Product' },
        { name: 'Lisbon', type: 'Location' },
      ],
      relations: [
        { source: 'Ána Souza', type: 'worksFor', target: 'Acme' },
        { source: 'Acme', type: 'makes', target: 'Roadrunner 2' },
        { source: 'Ána Souza', type: 'presentedAt', target: 'Lisbon' },
      ],
    }),
    respond.refusal(),
  );

  const result = await buildKnowledgeGraph(createModel(), documents, ontology);
  console.log(`Model calls: ${fakeModel.requests.length} for ${documents.length} documents`);

  console.log('\nEntities:');
  for (const entity of result.graph.entities) {
    const aliases = entity.aliases.length > 0 ? ` aka ${entity.aliases.join(', ')}` : '';
    console.log(`  ${entity.id.padEnd(26)} ${entity.name}${aliases}  [sources: ${entity.sources.join(', ')}]`);
  }
  console.log('\nRelations:');
  for (const relation of result.graph.relations) {
    console.log(`  ${relation.source} -[${relation.type}]-> ${relation.target}  [sources: ${relation.sources.join(', ')}]`);
  }
  console.log('\nRejected:');
  for (const rejection of result.rejected) {
    console.log(`  ${rejection.documentId}: ${rejection.reason}`);
  }
  console.log('\nFailed documents:');
  for (const failure of result.failed) {
    console.log(`  ${failure.documentId}: ${failure.reason}`);
  }
}

main().catch((error) => console.error(`demo failed: ${error.message}`));
