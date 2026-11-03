import type { GenerateRequest, Message, Model } from '@dojo/ai';

export interface RelationDefinition {
  name: string;
  domain: string;
  range: string;
}

export interface ExtractionOntology {
  classes: string[];
  relations: RelationDefinition[];
}

export interface ExtractedEntity {
  name: string;
  type: string;
  aliases?: string[];
}

export interface ExtractedRelation {
  source: string;
  type: string;
  target: string;
}

export interface Extraction {
  entities: ExtractedEntity[];
  relations: ExtractedRelation[];
}

export interface Rejection {
  item: ExtractedEntity | ExtractedRelation;
  reason: string;
}

export interface ValidationResult {
  accepted: Extraction;
  rejected: Rejection[];
}

export interface StoredEntity {
  id: string;
  name: string;
  type: string;
  aliases: string[];
  sources: string[];
}

export interface StoredRelation {
  source: string;
  type: string;
  target: string;
  sources: string[];
}

export interface KnowledgeGraph {
  entities: StoredEntity[];
  relations: StoredRelation[];
}

export interface MergeReport {
  created: number;
  merged: number;
  relationsAdded: number;
}

export interface SourceDocument {
  id: string;
  text: string;
}

export interface BuildResult {
  graph: KnowledgeGraph;
  rejected: Array<Rejection & { documentId: string }>;
  failed: Array<{ documentId: string; reason: string }>;
}

export class ExtractionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExtractionError';
  }
}

const LEGAL_SUFFIXES = new Set(['inc', 'incorporated', 'corp', 'corporation', 'co', 'company', 'ltd', 'limited', 'llc', 'gmbh', 'plc']);

export function normalizeName(name: string): string {
  const words = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter((word) => word.length > 0);
  if (words.length > 1 && words[0] === 'the') {
    words.shift();
  }
  while (words.length > 1 && LEGAL_SUFFIXES.has(words[words.length - 1])) {
    words.pop();
  }
  return words.join(' ');
}

export function parseExtraction(text: string): Extraction {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) {
    throw new ExtractionError('The reply contains no JSON object');
  }
  let value: unknown;
  try {
    value = JSON.parse(text.slice(start, end + 1));
  } catch (error) {
    throw new ExtractionError(`The reply is not valid JSON: ${(error as Error).message}`);
  }
  const candidate = value as Partial<Extraction> | null;
  if (candidate === null || typeof candidate !== 'object' || !Array.isArray(candidate.entities) || !Array.isArray(candidate.relations)) {
    throw new ExtractionError('The reply must be an object with "entities" and "relations" arrays');
  }
  return { entities: candidate.entities, relations: candidate.relations };
}

export function buildExtractionRequest(text: string, ontology: ExtractionOntology): GenerateRequest {
  const relations = ontology.relations.map((relation) => `- ${relation.name} (${relation.domain} -> ${relation.range})`).join('\n');
  const system = [
    'Extract entities and relations from the user text into a knowledge graph.',
    `Entity types (use only these): ${ontology.classes.join(', ')}.`,
    `Relations (use only these, source type -> target type):\n${relations}`,
    'Use the full name of each entity as "name" and list other spellings found in the text as "aliases".',
    'Reply with JSON only: {"entities":[{"name":"...","type":"...","aliases":["..."]}],"relations":[{"source":"<entity name>","type":"<relation>","target":"<entity name>"}]}',
  ].join('\n');
  return {
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: text },
    ],
    responseFormat: { type: 'json' },
  };
}

export async function extractGraph(model: Model, text: string, ontology: ExtractionOntology, { maxAttempts = 2 }: { maxAttempts?: number } = {}): Promise<Extraction> {
  const request = buildExtractionRequest(text, ontology);
  let messages: Message[] = request.messages;
  let lastProblem = '';
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const response = await model.generate({ ...request, messages });
    if (response.finishReason === 'refusal' || response.finishReason === 'content_filter') {
      throw new ExtractionError(`The model declined to extract (${response.finishReason})`);
    }
    try {
      return parseExtraction(response.text);
    } catch (error) {
      lastProblem = (error as Error).message;
      messages = [
        ...request.messages,
        { role: 'assistant', content: response.text },
        { role: 'user', content: `${lastProblem}. Reply again with the complete JSON object only, no prose and no code fence.` },
      ];
    }
  }
  throw new ExtractionError(`No valid extraction after ${maxAttempts} attempts: ${lastProblem}`);
}

export function validateExtraction(extraction: Extraction, ontology: ExtractionOntology): ValidationResult {
  const accepted: Extraction = { entities: [], relations: [] };
  const rejected: Rejection[] = [];
  const typeByName = new Map<string, string>();
  for (const entity of extraction.entities) {
    if (typeof entity.name !== 'string' || normalizeName(entity.name) === '') {
      rejected.push({ item: entity, reason: 'Entity has an empty name' });
    } else if (!ontology.classes.includes(entity.type)) {
      rejected.push({ item: entity, reason: `Entity "${entity.name}" has type "${entity.type}", which is not in the ontology` });
    } else {
      accepted.entities.push(entity);
      for (const name of [entity.name, ...(entity.aliases ?? [])]) {
        if (!typeByName.has(normalizeName(name))) {
          typeByName.set(normalizeName(name), entity.type);
        }
      }
    }
  }
  for (const relation of extraction.relations) {
    const definition = ontology.relations.find((candidate) => candidate.name === relation.type);
    const sourceType = typeByName.get(normalizeName(relation.source));
    const targetType = typeByName.get(normalizeName(relation.target));
    if (definition === undefined) {
      rejected.push({ item: relation, reason: `Relation "${relation.type}" is not in the ontology` });
    } else if (sourceType === undefined || targetType === undefined) {
      const missing = sourceType === undefined ? relation.source : relation.target;
      rejected.push({ item: relation, reason: `Relation "${relation.type}" references "${missing}", which is not an accepted entity` });
    } else if (sourceType !== definition.domain) {
      rejected.push({ item: relation, reason: `Relation "${relation.type}" needs a ${definition.domain} as source, got ${sourceType} "${relation.source}"` });
    } else if (targetType !== definition.range) {
      rejected.push({ item: relation, reason: `Relation "${relation.type}" needs a ${definition.range} as target, got ${targetType} "${relation.target}"` });
    } else {
      accepted.relations.push(relation);
    }
  }
  return { accepted, rejected };
}

export function createKnowledgeGraph(): KnowledgeGraph {
  return { entities: [], relations: [] };
}

export function resolveEntity(graph: KnowledgeGraph, name: string, type: string): StoredEntity | undefined {
  const key = normalizeName(name);
  return graph.entities.find((entity) => entity.type === type && [entity.name, ...entity.aliases].some((known) => normalizeName(known) === key));
}

export function mergeExtraction(graph: KnowledgeGraph, extraction: Extraction, documentId: string): MergeReport {
  const report: MergeReport = { created: 0, merged: 0, relationsAdded: 0 };
  const idByName = new Map<string, string>();
  for (const entity of extraction.entities) {
    const names = [entity.name, ...(entity.aliases ?? [])];
    let stored = names.map((name) => resolveEntity(graph, name, entity.type)).find((found) => found !== undefined);
    if (stored === undefined) {
      stored = {
        id: `${entity.type.toLowerCase()}:${normalizeName(entity.name).replace(/ /g, '-')}`,
        name: entity.name,
        type: entity.type,
        aliases: [],
        sources: [],
      };
      graph.entities.push(stored);
      report.created += 1;
    } else {
      report.merged += 1;
    }
    for (const name of names) {
      if (name !== stored.name && !stored.aliases.includes(name)) {
        stored.aliases.push(name);
      }
      if (!idByName.has(normalizeName(name))) {
        idByName.set(normalizeName(name), stored.id);
      }
    }
    if (!stored.sources.includes(documentId)) {
      stored.sources.push(documentId);
    }
  }
  for (const relation of extraction.relations) {
    const source = idByName.get(normalizeName(relation.source));
    const target = idByName.get(normalizeName(relation.target));
    if (source === undefined || target === undefined) {
      continue;
    }
    const existing = graph.relations.find((stored) => stored.source === source && stored.type === relation.type && stored.target === target);
    if (existing === undefined) {
      graph.relations.push({ source, type: relation.type, target, sources: [documentId] });
      report.relationsAdded += 1;
    } else if (!existing.sources.includes(documentId)) {
      existing.sources.push(documentId);
    }
  }
  return report;
}

export async function buildKnowledgeGraph(model: Model, documents: SourceDocument[], ontology: ExtractionOntology): Promise<BuildResult> {
  const result: BuildResult = { graph: createKnowledgeGraph(), rejected: [], failed: [] };
  for (const document of documents) {
    let extraction: Extraction;
    try {
      extraction = await extractGraph(model, document.text, ontology);
    } catch (error) {
      result.failed.push({ documentId: document.id, reason: (error as Error).message });
      continue;
    }
    const { accepted, rejected } = validateExtraction(extraction, ontology);
    result.rejected.push(...rejected.map((rejection) => ({ ...rejection, documentId: document.id })));
    mergeExtraction(result.graph, accepted, document.id);
  }
  return result;
}
