import type { GenerateRequest, GenerateResponse } from '@dojo/ai';

export interface ChatModel {
  generate(request: GenerateRequest): Promise<GenerateResponse>;
}

export interface Candidate {
  id: string;
  text: string;
}

export interface RerankedCandidate extends Candidate {
  score: number | null;
}

export interface RerankResult {
  results: RerankedCandidate[];
  reranked: boolean;
}

const USABLE_FINISH_REASONS = new Set(['stop', 'length']);

function repair(text: string): string {
  return text.replace(/'/g, '"').replace(/,\s*([}\]])/g, '$1');
}

function tryParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

export function parseJsonLoosely(text: string): unknown {
  const candidates = [text.trim()];
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) {
    candidates.push(fenced[1].trim());
  }
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    candidates.push(text.slice(firstBrace, lastBrace + 1));
  }
  for (const candidate of candidates) {
    const parsed = tryParse(candidate) ?? tryParse(repair(candidate));
    if (parsed !== undefined) {
      return parsed;
    }
  }
  return undefined;
}

async function askJson(model: ChatModel, system: string, user: string): Promise<unknown> {
  try {
    const response = await model.generate({
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      responseFormat: { type: 'json' },
    });
    return USABLE_FINISH_REASONS.has(response.finishReason) ? parseJsonLoosely(response.text) : undefined;
  } catch {
    return undefined;
  }
}

export async function generateQueries(model: ChatModel, question: string, { count = 3 }: { count?: number } = {}): Promise<string[]> {
  const parsed = (await askJson(
    model,
    `Rewrite the user's question into ${count} different search queries for a help center: use other words, expand abbreviations, split compound questions. Reply with JSON: {"queries": ["..."]}.`,
    question,
  )) as { queries?: unknown } | undefined;
  const rewrites = Array.isArray(parsed?.queries) ? parsed.queries : [];
  const queries = [question];
  const seen = new Set([question.trim().toLowerCase()]);
  for (const rewrite of rewrites) {
    if (typeof rewrite !== 'string' || rewrite.trim() === '' || seen.has(rewrite.trim().toLowerCase())) {
      continue;
    }
    seen.add(rewrite.trim().toLowerCase());
    queries.push(rewrite.trim());
  }
  return queries.slice(0, count + 1);
}

export async function hydeQuery(model: ChatModel, question: string): Promise<string> {
  try {
    const response = await model.generate({
      messages: [
        { role: 'system', content: 'Write a short passage, in the style of a help center article, that would answer the question. It is used only for search, so plausible details are fine.' },
        { role: 'user', content: question },
      ],
    });
    const passage = response.text.trim();
    return USABLE_FINISH_REASONS.has(response.finishReason) && passage !== '' ? `${question}\n\n${passage}` : question;
  } catch {
    return question;
  }
}

function isValidScore(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 10;
}

export async function rerank(model: ChatModel, query: string, candidates: Candidate[], { topK = candidates.length }: { topK?: number } = {}): Promise<RerankResult> {
  if (candidates.length === 0) {
    return { results: [], reranked: false };
  }
  const listing = candidates.map((candidate) => `[${candidate.id}] ${candidate.text}`).join('\n');
  const parsed = (await askJson(
    model,
    'Score how well each passage answers the query, from 0 (irrelevant) to 10 (answers it fully). Reply with JSON: {"scores": [{"id": "...", "score": 0}]}.',
    `Query: ${query}\n\nPassages:\n${listing}`,
  )) as { scores?: unknown } | undefined;
  const scores = new Map<string, number>();
  const knownIds = new Set(candidates.map((candidate) => candidate.id));
  for (const entry of Array.isArray(parsed?.scores) ? parsed.scores : []) {
    const { id, score } = (entry ?? {}) as { id?: unknown; score?: unknown };
    if (typeof id === 'string' && knownIds.has(id) && !scores.has(id) && isValidScore(score)) {
      scores.set(id, score);
    }
  }
  const scored = candidates.filter((candidate) => scores.has(candidate.id)).sort((left, right) => scores.get(right.id)! - scores.get(left.id)!);
  const unscored = candidates.filter((candidate) => !scores.has(candidate.id));
  const results = [...scored, ...unscored].map((candidate) => ({ ...candidate, score: scores.get(candidate.id) ?? null }));
  return { results: results.slice(0, topK), reranked: scores.size > 0 };
}
