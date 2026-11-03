import type { GenerateRequest, Model } from '@dojo/ai';

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

function adjacency(graph: EntityGraph): Map<string, Set<string>> {
  const neighbors = new Map(graph.entities.map((entity) => [entity.id, new Set<string>()]));
  for (const relation of graph.relations) {
    if (relation.source !== relation.target && neighbors.has(relation.source) && neighbors.has(relation.target)) {
      neighbors.get(relation.source)!.add(relation.target);
      neighbors.get(relation.target)!.add(relation.source);
    }
  }
  return neighbors;
}

export function detectCommunities(graph: EntityGraph, { maxIterations = 20 }: { maxIterations?: number } = {}): Community[] {
  const neighbors = adjacency(graph);
  const ids = [...neighbors.keys()].sort();
  const labels = new Map(ids.map((id) => [id, id]));
  const weight = (left: string, right: string) => 1 + [...neighbors.get(left)!].filter((id) => neighbors.get(right)!.has(id)).length;
  for (let iteration = 0; iteration < maxIterations; iteration++) {
    let changed = false;
    for (const id of ids) {
      const totals = new Map<string, number>();
      for (const neighbor of neighbors.get(id)!) {
        const label = labels.get(neighbor)!;
        totals.set(label, (totals.get(label) ?? 0) + weight(id, neighbor));
      }
      if (totals.size === 0) {
        continue;
      }
      const best = [...totals.entries()].sort(([leftLabel, left], [rightLabel, right]) => right - left || (leftLabel < rightLabel ? -1 : 1))[0][0];
      if (best !== labels.get(id)) {
        labels.set(id, best);
        changed = true;
      }
    }
    if (!changed) {
      break;
    }
  }
  const groups = new Map<string, string[]>();
  for (const id of ids) {
    const label = labels.get(id)!;
    groups.set(label, [...(groups.get(label) ?? []), id]);
  }
  return [...groups.values()]
    .sort((left, right) => right.length - left.length || (left[0] < right[0] ? -1 : 1))
    .map((members, index) => ({ id: `community-${index + 1}`, members }));
}

function parseObject(text: string): Record<string, unknown> | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) {
    return null;
  }
  try {
    const value = JSON.parse(text.slice(start, end + 1));
    return value !== null && typeof value === 'object' && !Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}

function summaryRequest(graph: EntityGraph, community: Community): GenerateRequest {
  const members = new Set(community.members);
  const entityLines = graph.entities.filter((entity) => members.has(entity.id)).map((entity) => `- ${entity.name} (${entity.type}): ${entity.description}`);
  const nameOf = new Map(graph.entities.map((entity) => [entity.id, entity.name]));
  const relationLines = graph.relations
    .filter((relation) => members.has(relation.source) && members.has(relation.target))
    .map((relation) => `- ${nameOf.get(relation.source)} -[${relation.type}]-> ${nameOf.get(relation.target)}`);
  return {
    messages: [
      { role: 'system', content: 'You write reports about one community of a knowledge graph. Reply with JSON only: {"title": "...", "summary": "..."}.' },
      { role: 'user', content: `Entities:\n${entityLines.join('\n')}\n\nRelations:\n${relationLines.join('\n') || '- none'}` },
    ],
    responseFormat: { type: 'json' },
  };
}

function fallbackReport(graph: EntityGraph, community: Community): CommunityReport {
  const members = new Set(community.members);
  const neighbors = adjacency(graph);
  const ranked = graph.entities
    .filter((entity) => members.has(entity.id))
    .map((entity) => ({ name: entity.name, degree: [...neighbors.get(entity.id)!].filter((id) => members.has(id)).length }))
    .sort((left, right) => right.degree - left.degree || (left.name < right.name ? -1 : 1));
  return {
    communityId: community.id,
    title: ranked.slice(0, 3).map((entry) => entry.name).join(', '),
    summary: `Members: ${ranked.map((entry) => entry.name).join(', ')}`,
    members: community.members,
    fallback: true,
  };
}

export async function summarizeCommunities(model: Model, graph: EntityGraph, communities: Community[]): Promise<CommunityReport[]> {
  const reports: CommunityReport[] = [];
  for (const community of communities) {
    const request = summaryRequest(graph, community);
    let report: CommunityReport | undefined;
    for (let attempt = 1; attempt <= 2 && report === undefined; attempt++) {
      const response = await model.generate(request);
      if (response.finishReason === 'refusal' || response.finishReason === 'content_filter') {
        break;
      }
      const parsed = parseObject(response.text);
      if (typeof parsed?.title === 'string' && parsed.title.trim() !== '' && typeof parsed.summary === 'string' && parsed.summary.trim() !== '') {
        report = { communityId: community.id, title: parsed.title, summary: parsed.summary, members: community.members, fallback: false };
      }
    }
    reports.push(report ?? fallbackReport(graph, community));
  }
  return reports;
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function routeQuestion(question: string, graph: EntityGraph): Route {
  const entityIds = graph.entities
    .filter((entity) => new RegExp(`(^|[^a-z0-9])${escapeRegExp(entity.name.toLowerCase())}($|[^a-z0-9])`).test(question.toLowerCase()))
    .map((entity) => entity.id);
  return entityIds.length > 0 ? { mode: 'local', entityIds } : { mode: 'global' };
}

export async function answerLocal(model: Model, question: string, graph: EntityGraph, entityIds: string[], { hops = 1 }: { hops?: number } = {}): Promise<LocalAnswer> {
  const neighbors = adjacency(graph);
  const included = entityIds.filter((id) => neighbors.has(id));
  const seen = new Set(included);
  let frontier = [...included];
  for (let depth = 1; depth <= hops; depth++) {
    const next: string[] = [];
    for (const id of frontier) {
      for (const neighbor of neighbors.get(id)!) {
        if (!seen.has(neighbor)) {
          seen.add(neighbor);
          included.push(neighbor);
          next.push(neighbor);
        }
      }
    }
    frontier = next;
  }
  const byId = new Map(graph.entities.map((entity) => [entity.id, entity]));
  const entityLines = included.map((id) => byId.get(id)!).map((entity) => `- ${entity.name} (${entity.type}): ${entity.description}`);
  const relationLines = graph.relations
    .filter((relation) => seen.has(relation.source) && seen.has(relation.target))
    .map((relation) => `- ${byId.get(relation.source)!.name} -[${relation.type}]-> ${byId.get(relation.target)!.name}`);
  const response = await model.generate({
    messages: [
      { role: 'system', content: 'Answer the question using only the knowledge graph context. Say so when the context is not enough.' },
      { role: 'user', content: `Entities:\n${entityLines.join('\n')}\n\nRelations:\n${relationLines.join('\n') || '- none'}\n\nQuestion: ${question}` },
    ],
  });
  return { mode: 'local', answer: response.text, entityIds: included };
}

export async function answerGlobal(
  model: Model,
  question: string,
  reports: CommunityReport[],
  { batchSize = 2, maxPoints = 5 }: { batchSize?: number; maxPoints?: number } = {},
): Promise<GlobalAnswer> {
  const points: RatedPoint[] = [];
  for (let start = 0; start < reports.length; start += batchSize) {
    const batch = reports.slice(start, start + batchSize);
    const response = await model.generate({
      messages: [
        {
          role: 'system',
          content: 'From the community reports, list the points that help answer the question. Rate each point from 0 (useless) to 100 (essential). Reply with JSON only: {"points": [{"text": "...", "score": 0}]}.',
        },
        { role: 'user', content: `${batch.map((report) => `## ${report.title}\n${report.summary}`).join('\n\n')}\n\nQuestion: ${question}` },
      ],
      responseFormat: { type: 'json' },
    });
    const parsed = parseObject(response.text);
    if (response.finishReason !== 'stop' || parsed === null || !Array.isArray(parsed.points)) {
      continue;
    }
    for (const point of parsed.points as Array<Partial<RatedPoint>>) {
      if (typeof point?.text === 'string' && point.text.trim() !== '' && typeof point.score === 'number' && point.score > 0) {
        points.push({ text: point.text, score: point.score });
      }
    }
  }
  const best = points.sort((left, right) => right.score - left.score).slice(0, maxPoints);
  if (best.length === 0) {
    return { mode: 'global', answer: null, points: [] };
  }
  const response = await model.generate({
    messages: [
      { role: 'system', content: 'Write the final answer from the rated points, most important first. Use only these points.' },
      { role: 'user', content: `Points:\n${best.map((point) => `- (${point.score}) ${point.text}`).join('\n')}\n\nQuestion: ${question}` },
    ],
  });
  return { mode: 'global', answer: response.text, points: best };
}
