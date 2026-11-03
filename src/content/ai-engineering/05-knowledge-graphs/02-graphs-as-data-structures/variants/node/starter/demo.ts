import { PropertyGraph, followPattern, nodesWithinHops, shortestPath, teamsAffectedBy } from './main';

function buildOrganization(): PropertyGraph {
  const graph = new PropertyGraph();
  const people = [
    { id: 'ana', name: 'Ana', onCall: true },
    { id: 'bruno', name: 'Bruno', onCall: false },
    { id: 'chen', name: 'Chen', onCall: true },
    { id: 'dara', name: 'Dara', onCall: true },
  ];
  people.forEach(({ id, ...properties }) => graph.addNode({ id, label: 'Person', properties }));
  [
    { id: 'payments-team', name: 'Payments' },
    { id: 'checkout-team', name: 'Checkout' },
    { id: 'growth-team', name: 'Growth' },
  ].forEach(({ id, ...properties }) => graph.addNode({ id, label: 'Team', properties }));
  ['payments-api', 'checkout-web', 'invoices-worker', 'recommendations'].forEach((id) => graph.addNode({ id, label: 'Service', properties: { name: id } }));
  graph.addNode({ id: 'payments-db', label: 'Database', properties: { name: 'payments-db', engine: 'postgres' } });

  graph.addEdge({ from: 'ana', to: 'payments-team', type: 'MEMBER_OF' });
  graph.addEdge({ from: 'bruno', to: 'payments-team', type: 'MEMBER_OF' });
  graph.addEdge({ from: 'chen', to: 'checkout-team', type: 'MEMBER_OF' });
  graph.addEdge({ from: 'dara', to: 'growth-team', type: 'MEMBER_OF' });
  graph.addEdge({ from: 'payments-team', to: 'payments-api', type: 'OWNS' });
  graph.addEdge({ from: 'payments-team', to: 'invoices-worker', type: 'OWNS' });
  graph.addEdge({ from: 'checkout-team', to: 'checkout-web', type: 'OWNS' });
  graph.addEdge({ from: 'growth-team', to: 'recommendations', type: 'OWNS' });
  graph.addEdge({ from: 'payments-api', to: 'payments-db', type: 'DEPENDS_ON' });
  graph.addEdge({ from: 'invoices-worker', to: 'payments-db', type: 'DEPENDS_ON' });
  graph.addEdge({ from: 'checkout-web', to: 'payments-api', type: 'DEPENDS_ON' });
  graph.addEdge({ from: 'recommendations', to: 'checkout-web', type: 'DEPENDS_ON' });
  return graph;
}

function main() {
  const graph = buildOrganization();

  console.log('Question: payments-db is down. Which teams are affected, and who is on call?');
  for (const maxDepth of [1, 2, 3]) {
    console.log(`  within ${maxDepth} DEPENDS_ON hop(s): ${teamsAffectedBy(graph, 'payments-db', maxDepth).join(', ')}`);
  }

  const dependents = nodesWithinHops(graph, 'payments-db', 2, { direction: 'in', types: ['DEPENDS_ON'] });
  const teamIds = followPattern(graph, dependents.map((reached) => reached.node.id), [{ type: 'OWNS', direction: 'in' }]).map((team) => team.id);
  const onCall = followPattern(graph, teamIds, [{ type: 'MEMBER_OF', direction: 'in' }]).filter((person) => person.properties.onCall === true);
  console.log(`  page within 2 hops: ${onCall.map((person) => person.properties.name).join(', ')}`);

  console.log('\nQuestion: how is Dara connected to payments-db?');
  const path = shortestPath(graph, 'dara', 'payments-db', { direction: 'both', maxDepth: 6 });
  if (path === null) {
    console.log('  no path within 6 hops');
  } else {
    const steps = path.edges.map((edge) => `${edge.from} -[${edge.type}]-> ${edge.to}`);
    console.log(`  ${path.edges.length} hops:\n    ${steps.join('\n    ')}`);
  }
  console.log(`  within 3 hops only: ${shortestPath(graph, 'dara', 'payments-db', { direction: 'both', maxDepth: 3 }) === null ? 'no path' : 'found'}`);
}

main();
