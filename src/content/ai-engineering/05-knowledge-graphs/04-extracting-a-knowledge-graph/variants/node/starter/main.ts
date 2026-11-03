import type { GenerateRequest, Model } from '@dojo/ai';

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
  // TODO: strip accents (NFD), lowercase, turn punctuation into spaces, collapse spaces, drop a leading "the" and trailing legal suffixes
  return name.trim().toLowerCase();
}

export function parseExtraction(text: string): Extraction {
  // TODO: parse the JSON object between the first "{" and the last "}"; throw ExtractionError when it is broken or lacks the two arrays
  return JSON.parse(text);
}

export function buildExtractionRequest(text: string, ontology: ExtractionOntology): GenerateRequest {
  // TODO: a system message listing every class and relation (with domain and range) and the JSON shape; the document as the user message; JSON response format
  return { messages: [{ role: 'user', content: `Extract entities and relations from: ${text}` }] };
}

export async function extractGraph(model: Model, text: string, ontology: ExtractionOntology, { maxAttempts = 2 }: { maxAttempts?: number } = {}): Promise<Extraction> {
  // TODO: refusals fail at once; an unparseable reply is re-asked with the bad reply and a correction in the history, up to maxAttempts calls
  const response = await model.generate(buildExtractionRequest(text, ontology));
  return parseExtraction(response.text);
}

export function validateExtraction(extraction: Extraction, ontology: ExtractionOntology): ValidationResult {
  // TODO: reject empty names, unknown types, unknown relations, relations to entities that were not accepted, and domain or range mismatches
  return { accepted: extraction, rejected: [] };
}

export function createKnowledgeGraph(): KnowledgeGraph {
  return { entities: [], relations: [] };
}

export function resolveEntity(graph: KnowledgeGraph, name: string, type: string): StoredEntity | undefined {
  // TODO: the stored entity of the same type whose name or alias has the same normalized form
  return graph.entities.find((entity) => entity.type === type && entity.name === name);
}

export function mergeExtraction(graph: KnowledgeGraph, extraction: Extraction, documentId: string): MergeReport {
  // TODO: resolve or create each entity, record aliases and sources, then add or update relations by resolved ids
  throw new Error('Not implemented');
}

export async function buildKnowledgeGraph(model: Model, documents: SourceDocument[], ontology: ExtractionOntology): Promise<BuildResult> {
  // TODO: extract, validate and merge each document; log rejected items with the document id and record failed documents
  throw new Error('Not implemented');
}
