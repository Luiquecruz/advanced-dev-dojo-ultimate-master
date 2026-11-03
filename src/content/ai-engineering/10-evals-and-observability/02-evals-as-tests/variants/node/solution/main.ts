import { cosineSimilarity, embed } from '@dojo/ai';
import type { GenerateRequest, GenerateResponse } from '@dojo/ai';
import type { z } from 'zod';

export interface ChatModel {
  generate(request: GenerateRequest): Promise<GenerateResponse>;
}

export interface EvalCase {
  id: string;
  input: string;
  expected?: unknown;
}

export interface Score {
  pass: boolean;
  score: number;
  detail: string;
}

export interface Scorer {
  name: string;
  score(output: string, evalCase: EvalCase): Score | Promise<Score>;
}

export interface EvalSuite {
  model: ChatModel;
  dataset: EvalCase[];
  prompt(evalCase: EvalCase): GenerateRequest;
  scorers: Scorer[];
}

export interface CaseResult {
  id: string;
  output: string | null;
  error: string | null;
  scores: Record<string, Score>;
  pass: boolean;
}

export interface ScorerSummary {
  passed: number;
  total: number;
  passRate: number;
  meanScore: number;
}

export interface EvalSummary {
  total: number;
  passed: number;
  failed: number;
  errored: number;
  passRate: number;
  byScorer: Record<string, ScorerSummary>;
}

export interface EvalReport {
  cases: CaseResult[];
  summary: EvalSummary;
}

const EDGE_NOISE = /^[\s.,!?"']+|[\s.,!?"']+$/g;

export function normalizeAnswer(text: string): string {
  return text.toLowerCase().replace(EDGE_NOISE, '').replace(/\s+/g, ' ');
}

function expectedText(evalCase: EvalCase, scorerName: string): string {
  if (evalCase.expected === undefined) {
    throw new Error(`Case "${evalCase.id}" has no expected value for the ${scorerName} scorer`);
  }
  return String(evalCase.expected);
}

export function exactScorer(): Scorer {
  return {
    name: 'exact',
    score(output, evalCase) {
      const expected = normalizeAnswer(expectedText(evalCase, 'exact'));
      const actual = normalizeAnswer(output);
      return actual === expected ? { pass: true, score: 1, detail: 'exact match' } : { pass: false, score: 0, detail: `expected "${expected}", got "${actual}"` };
    },
  };
}

export function schemaScorer(schema: z.ZodType): Scorer {
  return {
    name: 'schema',
    score(output) {
      let value: unknown;
      try {
        value = JSON.parse(output.trim());
      } catch (error) {
        return { pass: false, score: 0, detail: `invalid JSON: ${(error as Error).message}` };
      }
      const result = schema.safeParse(value);
      if (!result.success) {
        const issues = result.error.issues.map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`);
        return { pass: false, score: 0, detail: issues.join('; ') };
      }
      return { pass: true, score: 1, detail: 'matches the schema' };
    },
  };
}

export function semanticScorer({ threshold }: { threshold: number }): Scorer {
  return {
    name: 'semantic',
    score(output, evalCase) {
      const similarity = cosineSimilarity(embed(output), embed(expectedText(evalCase, 'semantic')));
      return { pass: similarity >= threshold, score: similarity, detail: `similarity ${similarity.toFixed(2)} (threshold ${threshold})` };
    },
  };
}

async function scoreSafely(scorer: Scorer, output: string, evalCase: EvalCase): Promise<Score> {
  try {
    return await scorer.score(output, evalCase);
  } catch (error) {
    return { pass: false, score: 0, detail: `scorer failed: ${(error as Error).message}` };
  }
}

async function runCase(suite: EvalSuite, evalCase: EvalCase): Promise<CaseResult> {
  let output: string;
  try {
    output = (await suite.model.generate(suite.prompt(evalCase))).text;
  } catch (error) {
    return { id: evalCase.id, output: null, error: (error as Error).message || String(error), scores: {}, pass: false };
  }
  const scores: Record<string, Score> = {};
  for (const scorer of suite.scorers) {
    scores[scorer.name] = await scoreSafely(scorer, output, evalCase);
  }
  return { id: evalCase.id, output, error: null, scores, pass: Object.values(scores).every((score) => score.pass) };
}

function summarize(cases: CaseResult[], scorers: Scorer[]): EvalSummary {
  const total = cases.length;
  const passed = cases.filter((result) => result.pass).length;
  const byScorer: Record<string, ScorerSummary> = {};
  for (const { name } of scorers) {
    const scores = cases.map((result) => result.scores[name]);
    const scorerPassed = scores.filter((score) => score?.pass).length;
    const scoreSum = scores.reduce((sum, score) => sum + (score?.score ?? 0), 0);
    byScorer[name] = { passed: scorerPassed, total, passRate: total === 0 ? 0 : scorerPassed / total, meanScore: total === 0 ? 0 : scoreSum / total };
  }
  return {
    total,
    passed,
    failed: total - passed,
    errored: cases.filter((result) => result.error !== null).length,
    passRate: total === 0 ? 0 : passed / total,
    byScorer,
  };
}

export async function runEval(suite: EvalSuite): Promise<EvalReport> {
  const cases: CaseResult[] = [];
  for (const evalCase of suite.dataset) {
    cases.push(await runCase(suite, evalCase));
  }
  return { cases, summary: summarize(cases, suite.scorers) };
}
