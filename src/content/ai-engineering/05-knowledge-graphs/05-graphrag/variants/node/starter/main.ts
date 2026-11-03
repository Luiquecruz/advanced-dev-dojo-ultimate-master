import type { Model } from '@dojo/ai';

export interface Entity {
  id: string;
  name: string;
  type: string;
  description: string;
}

export interface Relation {
  source: string;
  target: string;
  type: string;
}

export interface EntityGraph {
  entities: Entity[];
  relations: Relation[];
}

export interface Community {
  id: string;
  members: string[];
}

export interface CommunityReport {
  communityId: string;
  title: string;
  summary: string;
  members: string[];
  fallback: boolean;
}

export type Route = { mode: 'local'; entityIds: string[] } | { mode: 'global' };

export interface LocalAnswer {
  mode: 'local';
  answer: string;
  entityIds: string[];
}

export interface RatedPoint {
  text: string;
  score: number;
}

export interface GlobalAnswer {
  mode: 'global';
  answer: string | null;
  points: RatedPoint[];
}

export function detectCommunities(graph: EntityGraph, { maxIterations = 20 }: { maxIterations?: number } = {}): Community[] {
  // TODO: weighted label propagation over undirected neighbors, visiting ids in sorted order; group, sort and number the communities
  return graph.entities.map((entity, index) => ({ id: `community-${index + 1}`, members: [entity.id] }));
}

export async function summarizeCommunities(model: Model, graph: EntityGraph, communities: Community[]): Promise<CommunityReport[]> {
  // TODO: one JSON report per community from its own entities and relations; one retry, then a fallback report built from the graph
  throw new Error('Not implemented');
}

export function routeQuestion(question: string, graph: EntityGraph): Route {
  // TODO: local with the ids of every entity named in the question (whole words, any case), otherwise global
  return { mode: 'global' };
}

export async function answerLocal(model: Model, question: string, graph: EntityGraph, entityIds: string[], { hops = 1 }: { hops?: number } = {}): Promise<LocalAnswer> {
  // TODO: collect the neighborhood within hops, put its entities and relations in the prompt, answer with one call
  throw new Error('Not implemented');
}

export async function answerGlobal(
  model: Model,
  question: string,
  reports: CommunityReport[],
  { batchSize = 2, maxPoints = 5 }: { batchSize?: number; maxPoints?: number } = {},
): Promise<GlobalAnswer> {
  // TODO: map each batch of reports to rated points, keep the best maxPoints by score, reduce them into one answer
  throw new Error('Not implemented');
}
