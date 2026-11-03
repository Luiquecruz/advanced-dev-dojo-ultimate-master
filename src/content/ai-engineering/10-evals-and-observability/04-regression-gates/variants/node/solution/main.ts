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

const EPSILON = 1e-9;

async function runOnce(variant: Variant, evalCase: EvalCase, score: EvaluateOptions['score']): Promise<'pass' | 'fail' | 'error'> {
  try {
    const response = await variant.model.generate(variant.prompt(evalCase));
    return score(response.text, evalCase) ? 'pass' : 'fail';
  } catch {
    return 'error';
  }
}

export async function evaluateVariant(variant: Variant, { dataset, score, repeats = 3 }: EvaluateOptions): Promise<VariantRun> {
  const cases: CaseRuns[] = [];
  for (const evalCase of dataset) {
    let passes = 0;
    let errors = 0;
    for (let run = 0; run < repeats; run++) {
      const outcome = await runOnce(variant, evalCase, score);
      passes += outcome === 'pass' ? 1 : 0;
      errors += outcome === 'error' ? 1 : 0;
    }
    cases.push({ id: evalCase.id, critical: evalCase.critical === true, runs: repeats, passes, errors, passRate: passes / repeats });
  }
  const totalRuns = cases.reduce((sum, result) => sum + result.runs, 0);
  const totalPasses = cases.reduce((sum, result) => sum + result.passes, 0);
  return {
    variant: variant.name,
    repeats,
    cases,
    passRate: totalRuns === 0 ? 0 : totalPasses / totalRuns,
    flaky: cases.filter((result) => result.passRate > 0 && result.passRate < 1).map((result) => result.id),
  };
}

export function compareRuns(baseline: VariantRun, candidate: VariantRun, { tolerance = 0.02, caseTolerance = 0.34 }: GateOptions = {}): GateResult {
  const reasons: string[] = [];
  const candidateById = new Map(candidate.cases.map((result) => [result.id, result]));
  const baselineIds = new Set(baseline.cases.map((result) => result.id));
  const missing = baseline.cases.filter((result) => !candidateById.has(result.id)).map((result) => result.id);
  const added = candidate.cases.filter((result) => !baselineIds.has(result.id)).map((result) => result.id);
  if (missing.length > 0 || added.length > 0) {
    reasons.push(`The runs used different datasets (missing: ${missing.join(', ') || 'none'}; added: ${added.join(', ') || 'none'})`);
  }

  const diffs: CaseDiff[] = baseline.cases.flatMap((before) => {
    const after = candidateById.get(before.id);
    return after ? [{ id: before.id, critical: before.critical || after.critical, baseline: before.passRate, candidate: after.passRate, delta: after.passRate - before.passRate }] : [];
  });
  const regressions = diffs.filter((diff) => diff.delta < -caseTolerance - EPSILON);
  const improvements = diffs.filter((diff) => diff.delta > caseTolerance + EPSILON);

  const delta = candidate.passRate - baseline.passRate;
  if (delta < -tolerance - EPSILON) {
    reasons.push(`Pass rate dropped from ${baseline.passRate.toFixed(3)} to ${candidate.passRate.toFixed(3)}, beyond the tolerance of ${tolerance}`);
  }
  regressions
    .filter((diff) => diff.critical)
    .forEach((diff) => reasons.push(`Critical case "${diff.id}" regressed from ${diff.baseline.toFixed(2)} to ${diff.candidate.toFixed(2)}`));

  return {
    decision: reasons.length > 0 ? 'block' : 'pass',
    baselinePassRate: baseline.passRate,
    candidatePassRate: candidate.passRate,
    delta,
    regressions,
    improvements,
    reasons,
  };
}
