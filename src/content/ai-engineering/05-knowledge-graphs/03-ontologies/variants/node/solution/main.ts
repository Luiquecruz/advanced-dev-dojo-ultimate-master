export type Datatype = 'string' | 'number' | 'boolean';

export interface ClassDefinition {
  name: string;
  parent?: string;
}

export interface PropertyDefinition {
  name: string;
  kind: 'attribute' | 'relation';
  domain: string;
  range: string;
  min?: number;
  max?: number;
}

export interface Ontology {
  classes: ClassDefinition[];
  properties: PropertyDefinition[];
}

export interface GraphNode {
  id: string;
  label: string;
  properties: Record<string, unknown>;
}

export interface GraphEdge {
  from: string;
  to: string;
  type: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export type ViolationCode = 'unknown-class' | 'unknown-property' | 'unknown-node' | 'domain' | 'range' | 'min-cardinality' | 'max-cardinality';

export interface Violation {
  code: ViolationCode;
  subject: string;
  property?: string;
  message: string;
}

const DATATYPES: Datatype[] = ['string', 'number', 'boolean'];

function classByName(ontology: Ontology): Map<string, ClassDefinition> {
  return new Map(ontology.classes.map((definition) => [definition.name, definition]));
}

export function ancestorsOf(ontology: Ontology, className: string): string[] {
  const classes = classByName(ontology);
  const chain: string[] = [];
  let current = classes.get(className);
  while (current !== undefined && !chain.includes(current.name)) {
    chain.push(current.name);
    current = current.parent === undefined ? undefined : classes.get(current.parent);
  }
  return chain;
}

export function isSubclassOf(ontology: Ontology, className: string, ancestor: string): boolean {
  return ancestorsOf(ontology, className).includes(ancestor);
}

export function propertiesFor(ontology: Ontology, className: string): PropertyDefinition[] {
  const ancestors = ancestorsOf(ontology, className);
  return ontology.properties.filter((property) => ancestors.includes(property.domain));
}

export function validateOntology(ontology: Ontology): string[] {
  const classes = classByName(ontology);
  const problems: string[] = [];
  for (const definition of ontology.classes) {
    if (definition.parent !== undefined && !classes.has(definition.parent)) {
      problems.push(`Class "${definition.name}" has an unknown parent "${definition.parent}"`);
    }
    if (inheritanceCycle(classes, definition.name)) {
      problems.push(`Class "${definition.name}" is part of an inheritance cycle`);
    }
  }
  for (const property of ontology.properties) {
    if (!classes.has(property.domain)) {
      problems.push(`Property "${property.name}" has an unknown domain "${property.domain}"`);
    }
    if (property.kind === 'relation' && !classes.has(property.range)) {
      problems.push(`Relation "${property.name}" has an unknown range class "${property.range}"`);
    }
    if (property.kind === 'attribute' && !DATATYPES.includes(property.range as Datatype)) {
      problems.push(`Attribute "${property.name}" has range "${property.range}", which is not one of ${DATATYPES.join(', ')}`);
    }
  }
  return problems;
}

function inheritanceCycle(classes: Map<string, ClassDefinition>, className: string): boolean {
  const seen = new Set<string>();
  let current = classes.get(className);
  while (current?.parent !== undefined) {
    if (current.parent === className) {
      return true;
    }
    if (seen.has(current.parent)) {
      return false;
    }
    seen.add(current.parent);
    current = classes.get(current.parent);
  }
  return false;
}

export function validateGraph(ontology: Ontology, graph: GraphData): Violation[] {
  const classes = classByName(ontology);
  const propertiesByName = new Map(ontology.properties.map((property) => [property.name, property]));
  const nodesById = new Map(graph.nodes.map((node) => [node.id, node]));
  const violations: Violation[] = [];
  const report = (code: ViolationCode, subject: string, message: string, property?: string) =>
    violations.push(property === undefined ? { code, subject, message } : { code, subject, property, message });

  for (const node of graph.nodes) {
    if (!classes.has(node.label)) {
      report('unknown-class', node.id, `Node "${node.id}" has class "${node.label}", which the ontology does not define`);
      continue;
    }
    for (const [key, value] of Object.entries(node.properties)) {
      const definition = propertiesByName.get(key);
      if (definition === undefined || definition.kind !== 'attribute') {
        report('unknown-property', node.id, `Node "${node.id}" has property "${key}", which is not an attribute in the ontology`, key);
        continue;
      }
      if (!isSubclassOf(ontology, node.label, definition.domain)) {
        report('domain', node.id, `Node "${node.id}" is a ${node.label}, but "${key}" applies to ${definition.domain}`, key);
      }
      if (typeof value !== definition.range) {
        report('range', node.id, `Node "${node.id}" has ${typeof value} value for "${key}", expected ${definition.range}`, key);
      }
    }
    for (const definition of propertiesFor(ontology, node.label)) {
      const count =
        definition.kind === 'attribute'
          ? Number(node.properties[definition.name] !== undefined)
          : graph.edges.filter((edge) => edge.from === node.id && edge.type === definition.name && nodesById.has(edge.to)).length;
      if (definition.min !== undefined && count < definition.min) {
        report('min-cardinality', node.id, `Node "${node.id}" has ${count} "${definition.name}", at least ${definition.min} required`, definition.name);
      }
      if (definition.max !== undefined && count > definition.max) {
        report('max-cardinality', node.id, `Node "${node.id}" has ${count} "${definition.name}", at most ${definition.max} allowed`, definition.name);
      }
    }
  }

  for (const edge of graph.edges) {
    const subject = `${edge.from} -[${edge.type}]-> ${edge.to}`;
    const missing = [edge.from, edge.to].filter((id) => !nodesById.has(id));
    if (missing.length > 0) {
      report('unknown-node', subject, `Edge ${subject} references unknown node "${missing.join('", "')}"`);
      continue;
    }
    const definition = propertiesByName.get(edge.type);
    if (definition === undefined || definition.kind !== 'relation') {
      report('unknown-property', subject, `Edge ${subject} has type "${edge.type}", which is not a relation in the ontology`, edge.type);
      continue;
    }
    const source = nodesById.get(edge.from)!;
    const target = nodesById.get(edge.to)!;
    if (classes.has(source.label) && !isSubclassOf(ontology, source.label, definition.domain)) {
      report('domain', subject, `Edge ${subject} starts at a ${source.label}, but "${edge.type}" applies to ${definition.domain}`, edge.type);
    }
    if (classes.has(target.label) && !isSubclassOf(ontology, target.label, definition.range)) {
      report('range', subject, `Edge ${subject} points to a ${target.label}, but "${edge.type}" expects ${definition.range}`, edge.type);
    }
  }
  return violations;
}
