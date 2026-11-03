import type { GenerateRequest, GenerateResponse } from '@dojo/ai';

export interface ChatModel {
  generate(request: GenerateRequest): Promise<GenerateResponse>;
}

export interface EvalCase {
  id: string;
  input: string;
  expected: string;
  critical?: boolean;
}

export interface Variant {
  name: string;
  model: ChatModel;
  prompt(evalCase: EvalCase): GenerateRequest;
}

export interface EvaluateOptions {
  dataset: EvalCase[];
  score(output: string, evalCase: EvalCase): boolean;
  repeats?: number;
}

export interface CaseRuns {
  id: string;
  critical: boolean;
  runs: number;
  passes: number;
  errors: number;
  passRate: number;
}

export interface VariantRun {
  variant: string;
  repeats: number;
  cases: CaseRuns[];
  passRate: number;
  flaky: string[];
}

export interface CaseDiff {
  id: string;
  critical: boolean;
  baseline: number;
  candidate: number;
  delta: number;
}

export interface GateOptions {
  tolerance?: number;
  caseTolerance?: number;
}

export interface GateResult {
  decision: 'pass' | 'block';
  baselinePassRate: number;
  candidatePassRate: number;
  delta: number;
  regressions: CaseDiff[];
  improvements: CaseDiff[];
  reasons: string[];
}

export async function evaluateVariant(variant: Variant, { dataset, score, repeats = 3 }: EvaluateOptions): Promise<VariantRun> {
  // TODO: run every case `repeats` times in a row; a model error is a failed run, counted in errors; list flaky cases
  const cases: CaseRuns[] = [];
  for (const evalCase of dataset) {
    const response = await variant.model.generate(variant.prompt(evalCase));
    const passes = score(response.text, evalCase) ? 1 : 0;
    cases.push({ id: evalCase.id, critical: evalCase.critical === true, runs: 1, passes, errors: 0, passRate: passes });
  }
  const passRate = cases.reduce((sum, result) => sum + result.passRate, 0) / cases.length;
  return { variant: variant.name, repeats: 1, cases, passRate, flaky: [] };
}

export function compareRuns(baseline: VariantRun, candidate: VariantRun, { tolerance = 0.02, caseTolerance = 0.34 }: GateOptions = {}): GateResult {
  // TODO: refuse different datasets, diff every case, block on an aggregate drop beyond tolerance or a regressed critical case
  const delta = candidate.passRate - baseline.passRate;
  return {
    decision: delta < 0 ? 'block' : 'pass',
    baselinePassRate: baseline.passRate,
    candidatePassRate: candidate.passRate,
    delta,
    regressions: [],
    improvements: [],
    reasons: [],
  };
}
