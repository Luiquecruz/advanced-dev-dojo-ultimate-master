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

export function ancestorsOf(ontology: Ontology, className: string): string[] {
  // TODO: the class itself, then its parent, grandparent... up to the root; [] for an unknown class; stop on a cycle
  return [className];
}

export function isSubclassOf(ontology: Ontology, className: string, ancestor: string): boolean {
  // TODO: true when ancestor is the class itself or one of its ancestors
  return className === ancestor;
}

export function propertiesFor(ontology: Ontology, className: string): PropertyDefinition[] {
  // TODO: properties whose domain is the class or one of its ancestors, in ontology order
  return ontology.properties.filter((property) => property.domain === className);
}

export function validateOntology(ontology: Ontology): string[] {
  // TODO: unknown parents, inheritance cycles, unknown domains or relation ranges, attribute ranges that are not datatypes
  return [];
}

export function validateGraph(ontology: Ontology, graph: GraphData): Violation[] {
  // TODO: collect every violation: unknown classes, properties and nodes, domain, range and cardinality
  const known = new Set(ontology.classes.map((definition) => definition.name));
  return graph.nodes
    .filter((node) => !known.has(node.label))
    .map((node) => ({ code: 'unknown-class' as const, subject: node.id, message: `Unknown class ${node.label}` }));
}
