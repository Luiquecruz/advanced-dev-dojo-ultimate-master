function companyOntology() {
  return {
    classes: [
      { name: 'Entity' },
      { name: 'Organization', parent: 'Entity' },
      { name: 'Company', parent: 'Organization' },
      { name: 'Person', parent: 'Entity' },
      { name: 'Employee', parent: 'Person' },
      { name: 'Manager', parent: 'Employee' },
      { name: 'Project', parent: 'Entity' },
    ],
    properties: [
      { name: 'name', kind: 'attribute', domain: 'Entity', range: 'string', min: 1, max: 1 },
      { name: 'email', kind: 'attribute', domain: 'Person', range: 'string', max: 1 },
      { name: 'headcount', kind: 'attribute', domain: 'Organization', range: 'number' },
      { name: 'active', kind: 'attribute', domain: 'Project', range: 'boolean' },
      { name: 'worksFor', kind: 'relation', domain: 'Employee', range: 'Organization', min: 1, max: 1 },
      { name: 'reportsTo', kind: 'relation', domain: 'Employee', range: 'Manager', max: 1 },
      { name: 'manages', kind: 'relation', domain: 'Manager', range: 'Project' },
    ],
  };
}

function validGraph() {
  return {
    nodes: [
      { id: 'acme', label: 'Company', properties: { name: 'Acme', headcount: 120 } },
      { id: 'lia', label: 'Manager', properties: { name: 'Lia', email: 'lia@acme.test' } },
      { id: 'tom', label: 'Employee', properties: { name: 'Tom' } },
      { id: 'atlas', label: 'Project', properties: { name: 'Atlas', active: true } },
    ],
    edges: [
      { from: 'lia', type: 'worksFor', to: 'acme' },
      { from: 'tom', type: 'worksFor', to: 'acme' },
      { from: 'tom', type: 'reportsTo', to: 'lia' },
      { from: 'lia', type: 'manages', to: 'atlas' },
    ],
  };
}

function keys(violations: Array<{ code: string; subject: string; property?: string }>) {
  return violations.map((violation) => `${violation.code}|${violation.subject}|${violation.property ?? ''}`).sort();
}

test('ancestorsOf and isSubclassOf follow the inheritance chain up to the root', () => {
  const ontology = companyOntology();
  expect(mod.ancestorsOf(ontology, 'Manager')).toEqual(['Manager', 'Employee', 'Person', 'Entity']);
  expect(mod.ancestorsOf(ontology, 'Entity')).toEqual(['Entity']);
  expect(mod.ancestorsOf(ontology, 'Spaceship')).toEqual([]);
  expect(mod.isSubclassOf(ontology, 'Manager', 'Person')).toBe(true);
  expect(mod.isSubclassOf(ontology, 'Company', 'Organization')).toBe(true);
  expect(mod.isSubclassOf(ontology, 'Employee', 'Employee')).toBe(true);
  expect(mod.isSubclassOf(ontology, 'Employee', 'Manager')).toBe(false);
  expect(mod.isSubclassOf(ontology, 'Company', 'Person')).toBe(false);
  expect(mod.isSubclassOf(ontology, 'Spaceship', 'Entity')).toBe(false);
});

test('propertiesFor returns the properties a class declares or inherits, in ontology order', () => {
  const ontology = companyOntology();
  const names = (className: string) => mod.propertiesFor(ontology, className).map((property: { name: string }) => property.name);
  expect(names('Manager')).toEqual(['name', 'email', 'worksFor', 'reportsTo', 'manages']);
  expect(names('Employee')).toEqual(['name', 'email', 'worksFor', 'reportsTo']);
  expect(names('Person')).toEqual(['name', 'email']);
  expect(names('Company')).toEqual(['name', 'headcount']);
  expect(names('Spaceship')).toEqual([]);
});

test('validateOntology reports unknown parents, inheritance cycles, unknown domains and ranges, and attribute ranges that are not datatypes', () => {
  expect(mod.validateOntology(companyOntology())).toEqual([]);
  const broken = {
    classes: [
      { name: 'Entity' },
      { name: 'Robot', parent: 'Machine' },
      { name: 'Chicken', parent: 'Egg' },
      { name: 'Egg', parent: 'Chicken' },
    ],
    properties: [
      { name: 'name', kind: 'attribute', domain: 'Entity', range: 'string' },
      { name: 'serial', kind: 'attribute', domain: 'Gadget', range: 'string' },
      { name: 'builtBy', kind: 'relation', domain: 'Robot', range: 'Factory' },
      { name: 'weight', kind: 'attribute', domain: 'Entity', range: 'kilograms' },
    ],
  };
  const problems: string[] = mod.validateOntology(broken);
  expect(problems).toHaveLength(6);
  for (const name of ['Machine', 'Chicken', 'Egg', 'Gadget', 'Factory', 'kilograms']) {
    expect(problems.some((problem) => problem.includes(name))).toBe(true);
  }
});

test('validateGraph accepts a valid graph, including subclasses where the ontology names a parent class', () => {
  expect(mod.validateGraph(companyOntology(), validGraph())).toEqual([]);
  expect(mod.validateGraph(companyOntology(), { nodes: [], edges: [] })).toEqual([]);
});

test('validateGraph reports unknown classes, properties and nodes with messages naming the subject', () => {
  const graph = validGraph();
  graph.nodes.push({ id: 'zed', label: 'Alien', properties: { name: 'Zed' } });
  graph.nodes[2].properties = { name: 'Tom', shoeSize: 44 } as Record<string, unknown>;
  graph.edges.push({ from: 'tom', type: 'likes', to: 'atlas' });
  graph.edges.push({ from: 'tom', type: 'worksFor', to: 'ghost-corp' });
  graph.edges.push({ from: 'lia', type: 'manages', to: 'zed' });
  graph.nodes[1].properties.worksFor = 'acme';
  const violations = mod.validateGraph(companyOntology(), graph);
  expect(keys(violations)).toEqual([
    'unknown-class|zed|',
    'unknown-node|tom -[worksFor]-> ghost-corp|',
    'unknown-property|lia|worksFor',
    'unknown-property|tom -[likes]-> atlas|likes',
    'unknown-property|tom|shoeSize',
  ]);
  violations.forEach((violation: { subject: string; message: string; property?: string }) => {
    expect(violation.message).toContain(violation.subject.split(' ')[0]);
    if (violation.property !== undefined) {
      expect(violation.message).toContain(violation.property);
    }
  });
});

test('validateGraph checks domain and range on attributes and relations, honoring inheritance', () => {
  const graph = validGraph();
  graph.nodes[0].properties.headcount = 'one hundred twenty' as unknown as number;
  graph.nodes[3].properties.email = 'atlas@acme.test' as never;
  graph.edges.push({ from: 'acme', type: 'manages', to: 'atlas' });
  graph.edges.push({ from: 'lia', type: 'manages', to: 'tom' });
  graph.edges.push({ from: 'lia', type: 'reportsTo', to: 'tom' });
  const violations = mod.validateGraph(companyOntology(), graph);
  expect(keys(violations)).toEqual([
    'domain|acme -[manages]-> atlas|manages',
    'domain|atlas|email',
    'range|acme|headcount',
    'range|lia -[manages]-> tom|manages',
    'range|lia -[reportsTo]-> tom|reportsTo',
  ]);
});

test('validateGraph checks minimum and maximum cardinality, including inherited properties, and returns every violation at once', () => {
  const graph = validGraph();
  graph.nodes.push({ id: 'ivy', label: 'Employee', properties: {} });
  graph.nodes.push({ id: 'globex', label: 'Company', properties: { name: 'Globex' } });
  graph.edges.push({ from: 'tom', type: 'worksFor', to: 'globex' });
  graph.edges.push({ from: 'lia', type: 'reportsTo', to: 'lia' });
  graph.edges.push({ from: 'tom', type: 'reportsTo', to: 'lia' });
  const violations = mod.validateGraph(companyOntology(), graph);
  expect(keys(violations)).toEqual([
    'max-cardinality|tom|reportsTo',
    'max-cardinality|tom|worksFor',
    'min-cardinality|ivy|name',
    'min-cardinality|ivy|worksFor',
  ]);
  violations.forEach((violation: { message: string; subject: string; property: string }) => {
    expect(violation.message).toContain(violation.subject);
    expect(violation.message).toContain(violation.property);
  });
});
