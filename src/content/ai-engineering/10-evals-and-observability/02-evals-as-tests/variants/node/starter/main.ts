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

export function normalizeAnswer(text: string): string {
  // TODO: lowercase, strip whitespace and . , ! ? " ' at both ends, collapse inner whitespace
  return text;
}

export function exactScorer(): Scorer {
  return {
    name: 'exact',
    score(output, evalCase) {
      // TODO: compare normalized output and expected; fail with a detail; throw when the case has no expected value
      const pass = output === evalCase.expected;
      return { pass, score: pass ? 1 : 0, detail: '' };
    },
  };
}

export function schemaScorer(schema: z.ZodType): Scorer {
  return {
    name: 'schema',
    score(output) {
      // TODO: parse the output strictly as JSON, validate it with schema.safeParse and explain every failure
      throw new Error('Not implemented');
    },
  };
}

export function semanticScorer({ threshold }: { threshold: number }): Scorer {
  return {
    name: 'semantic',
    score(output, evalCase) {
      // TODO: cosine similarity of embed(output) and embed(expected), pass at or above the threshold
      throw new Error('Not implemented');
    },
  };
}

export async function runEval(suite: EvalSuite): Promise<EvalReport> {
  // TODO: run cases one at a time; a model error fails its case, a throwing scorer fails its score; build the summary
  const cases: CaseResult[] = [];
  for (const evalCase of suite.dataset) {
    const output = (await suite.model.generate(suite.prompt(evalCase))).text;
    const scores: Record<string, Score> = {};
    for (const scorer of suite.scorers) {
      scores[scorer.name] = await scorer.score(output, evalCase);
    }
    cases.push({ id: evalCase.id, output, error: null, scores, pass: Object.values(scores).every((score) => score.pass) });
  }
  const passed = cases.filter((result) => result.pass).length;
  return { cases, summary: { total: cases.length, passed, failed: cases.length - passed, errored: 0, passRate: passed / cases.length, byScorer: {} } };
}
