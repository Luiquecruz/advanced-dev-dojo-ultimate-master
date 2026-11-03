import { propertiesFor, validateGraph, validateOntology } from './main';
import type { Ontology } from './main';

const ontology: Ontology = {
  classes: [
    { name: 'Entity' },
    { name: 'Organization', parent: 'Entity' },
    { name: 'Supplier', parent: 'Organization' },
    { name: 'Part', parent: 'Entity' },
    { name: 'Product', parent: 'Entity' },
  ],
  properties: [
    { name: 'name', kind: 'attribute', domain: 'Entity', range: 'string', min: 1, max: 1 },
    { name: 'country', kind: 'attribute', domain: 'Organization', range: 'string', max: 1 },
    { name: 'unitCost', kind: 'attribute', domain: 'Part', range: 'number', max: 1 },
    { name: 'supplies', kind: 'relation', domain: 'Supplier', range: 'Part' },
    { name: 'usedIn', kind: 'relation', domain: 'Part', range: 'Product', min: 1 },
  ],
};

const extracted = {
  nodes: [
    { id: 'acme', label: 'Supplier', properties: { name: 'Acme Metals', country: 'DE' } },
    { id: 'bolt-m4', label: 'Part', properties: { name: 'M4 bolt', unitCost: 0.04 } },
    { id: 'hinge', label: 'Part', properties: { name: 'Hinge', unitCost: 'cheap' } },
    { id: 'gasket', label: 'Part', properties: { name: 'Gasket' } },
    { id: 'kettle', label: 'Product', properties: { name: 'Kettle', color: 'red' } },
    { id: 'berlin', label: 'City', properties: { name: 'Berlin' } },
  ],
  edges: [
    { from: 'acme', type: 'supplies', to: 'bolt-m4' },
    { from: 'acme', type: 'supplies', to: 'kettle' },
    { from: 'bolt-m4', type: 'usedIn', to: 'kettle' },
    { from: 'hinge', type: 'usedIn', to: 'kettle' },
    { from: 'kettle', type: 'usedIn', to: 'bolt-m4' },
    { from: 'acme', type: 'locatedIn', to: 'berlin' },
  ],
};

function main() {
  const ontologyProblems = validateOntology(ontology);
  console.log(`Ontology problems: ${ontologyProblems.length === 0 ? 'none' : ontologyProblems.join('; ')}`);
  console.log(`A Supplier may have: ${propertiesFor(ontology, 'Supplier').map((property) => property.name).join(', ')}`);

  const violations = validateGraph(ontology, extracted);
  console.log(`\n${violations.length} violations in the extracted graph:`);
  for (const violation of violations) {
    console.log(`  [${violation.code}] ${violation.message}`);
  }
  const rejectedSubjects = new Set(violations.map((violation) => violation.subject));
  const clean = extracted.nodes.filter((node) => !rejectedSubjects.has(node.id)).map((node) => node.id);
  console.log(`\nNodes with no violation: ${clean.join(', ')}`);
}

main();
