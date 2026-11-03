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
  private readonly outgoing = new Map<string, GraphEdge[]>();
  private readonly incoming = new Map<string, GraphEdge[]>();

  addNode(node: GraphNode): GraphNode {
    if (this.nodes.has(node.id)) {
      throw new GraphError(`Node "${node.id}" already exists`);
    }
    this.nodes.set(node.id, node);
    this.outgoing.set(node.id, []);
    this.incoming.set(node.id, []);
    return node;
  }

  addEdge(edge: GraphEdge): GraphEdge {
    for (const endpoint of [edge.from, edge.to]) {
      if (!this.nodes.has(endpoint)) {
        throw new GraphError(`Edge ${edge.type} references unknown node "${endpoint}"`);
      }
    }
    this.outgoing.get(edge.from)!.push(edge);
    this.incoming.get(edge.to)!.push(edge);
    return edge;
  }

  getNode(id: string): GraphNode | undefined {
    return this.nodes.get(id);
  }

  findNodes(label: string, properties: Record<string, unknown> = {}): GraphNode[] {
    return [...this.nodes.values()].filter(
      (node) => node.label === label && Object.entries(properties).every(([key, value]) => node.properties[key] === value),
    );
  }

  neighbors(id: string, { direction = 'out', types }: TraversalOptions = {}): Neighbor[] {
    if (!this.nodes.has(id)) {
      throw new GraphError(`Unknown node "${id}"`);
    }
    const result: Neighbor[] = [];
    if (direction === 'out' || direction === 'both') {
      for (const edge of this.outgoing.get(id)!) {
        result.push({ node: this.nodes.get(edge.to)!, edge });
      }
    }
    if (direction === 'in' || direction === 'both') {
      for (const edge of this.incoming.get(id)!) {
        result.push({ node: this.nodes.get(edge.from)!, edge });
      }
    }
    return types === undefined ? result : result.filter((neighbor) => types.includes(neighbor.edge.type));
  }
}

export function nodesWithinHops(graph: PropertyGraph, startId: string, maxDepth: number, options: TraversalOptions = {}): Reached[] {
  const visited = new Set<string>([startId]);
  const reached: Reached[] = [];
  let frontier = [startId];
  for (let depth = 1; depth <= maxDepth && frontier.length > 0; depth++) {
    const next: string[] = [];
    for (const id of frontier) {
      for (const { node } of graph.neighbors(id, options)) {
        if (!visited.has(node.id)) {
          visited.add(node.id);
          reached.push({ node, depth });
          next.push(node.id);
        }
      }
    }
    frontier = next;
  }
  return reached;
}

export function shortestPath(graph: PropertyGraph, startId: string, targetId: string, options: TraversalOptions & { maxDepth: number }): Path | null {
  if (graph.getNode(startId) === undefined || graph.getNode(targetId) === undefined) {
    return null;
  }
  if (startId === targetId) {
    return { nodes: [startId], edges: [] };
  }
  const cameFrom = new Map<string, { previous: string; edge: GraphEdge }>();
  const visited = new Set<string>([startId]);
  let frontier = [startId];
  for (let depth = 1; depth <= options.maxDepth && frontier.length > 0; depth++) {
    const next: string[] = [];
    for (const id of frontier) {
      for (const { node, edge } of graph.neighbors(id, options)) {
        if (visited.has(node.id)) {
          continue;
        }
        visited.add(node.id);
        cameFrom.set(node.id, { previous: id, edge });
        if (node.id === targetId) {
          return reconstruct(cameFrom, startId, targetId);
        }
        next.push(node.id);
      }
    }
    frontier = next;
  }
  return null;
}

function reconstruct(cameFrom: Map<string, { previous: string; edge: GraphEdge }>, startId: string, targetId: string): Path {
  const nodes = [targetId];
  const edges: GraphEdge[] = [];
  let current = targetId;
  while (current !== startId) {
    const step = cameFrom.get(current)!;
    edges.unshift(step.edge);
    nodes.unshift(step.previous);
    current = step.previous;
  }
  return { nodes, edges };
}

export function followPattern(graph: PropertyGraph, startIds: string[], steps: PatternStep[]): GraphNode[] {
  let frontier = startIds.map((id) => graph.getNode(id)).filter((node): node is GraphNode => node !== undefined);
  for (const step of steps) {
    const next = new Map<string, GraphNode>();
    for (const current of frontier) {
      for (const { node } of graph.neighbors(current.id, { direction: step.direction, types: [step.type] })) {
        if (!next.has(node.id)) {
          next.set(node.id, node);
        }
      }
    }
    frontier = [...next.values()];
  }
  return frontier;
}

export function teamsAffectedBy(graph: PropertyGraph, nodeId: string, maxDepth: number): string[] {
  const dependents = nodesWithinHops(graph, nodeId, maxDepth, { direction: 'in', types: ['DEPENDS_ON'] });
  const services = dependents.filter((reached) => reached.node.label === 'Service').map((reached) => reached.node.id);
  const teams = followPattern(graph, services, [{ type: 'OWNS', direction: 'in' }]);
  return teams.map((team) => String(team.properties.name)).sort();
}
