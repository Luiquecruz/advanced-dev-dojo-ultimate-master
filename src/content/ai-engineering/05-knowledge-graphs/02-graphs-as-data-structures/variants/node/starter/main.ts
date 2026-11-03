export type Direction = 'out' | 'in' | 'both';

export interface GraphNode {
  id: string;
  label: string;
  properties: Record<string, unknown>;
}

export interface GraphEdge {
  from: string;
  to: string;
  type: string;
  properties?: Record<string, unknown>;
}

export interface Neighbor {
  node: GraphNode;
  edge: GraphEdge;
}

export interface TraversalOptions {
  direction?: Direction;
  types?: string[];
}

export interface Reached {
  node: GraphNode;
  depth: number;
}

export interface Path {
  nodes: string[];
  edges: GraphEdge[];
}

export interface PatternStep {
  type: string;
  direction: 'out' | 'in';
}

export class GraphError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GraphError';
  }
}

export class PropertyGraph {
  private readonly nodes = new Map<string, GraphNode>();
  private readonly edges: GraphEdge[] = [];

  addNode(node: GraphNode): GraphNode {
    // TODO: reject a duplicate id with a GraphError and prepare the adjacency index for the node
    this.nodes.set(node.id, node);
    return node;
  }

  addEdge(edge: GraphEdge): GraphEdge {
    // TODO: reject an edge whose endpoint does not exist, then index it as outgoing of `from` and incoming of `to`
    this.edges.push(edge);
    return edge;
  }

  getNode(id: string): GraphNode | undefined {
    return this.nodes.get(id);
  }

  findNodes(label: string, properties: Record<string, unknown> = {}): GraphNode[] {
    // TODO: nodes with this label whose properties equal every given property
    return [...this.nodes.values()].filter((node) => node.label === label);
  }

  neighbors(id: string, options: TraversalOptions = {}): Neighbor[] {
    // TODO: read the adjacency index instead of scanning every edge; support direction ('out', 'in', 'both') and types
    return this.edges.filter((edge) => edge.from === id).map((edge) => ({ node: this.nodes.get(edge.to)!, edge }));
  }
}

export function nodesWithinHops(graph: PropertyGraph, startId: string, maxDepth: number, options: TraversalOptions = {}): Reached[] {
  // TODO: breadth-first search up to maxDepth hops; every node once, at its smallest depth, never the start
  throw new Error('Not implemented');
}

export function shortestPath(graph: PropertyGraph, startId: string, targetId: string, options: TraversalOptions & { maxDepth: number }): Path | null {
  // TODO: breadth-first search remembering how each node was reached, then walk back from the target
  throw new Error('Not implemented');
}

export function followPattern(graph: PropertyGraph, startIds: string[], steps: PatternStep[]): GraphNode[] {
  // TODO: follow one edge type and direction per step, keeping distinct nodes in discovery order
  throw new Error('Not implemented');
}

export function teamsAffectedBy(graph: PropertyGraph, nodeId: string, maxDepth: number): string[] {
  // TODO: services depending on the node within maxDepth DEPENDS_ON hops, then the teams that OWN them, names sorted
  throw new Error('Not implemented');
}
