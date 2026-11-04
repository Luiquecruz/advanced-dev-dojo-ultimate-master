import { citedSources } from './agent';
import type { AgentResult } from './agent';
import type { GoldenCase } from './briefing';

export interface CaseResult {
  id: string;
  pass: boolean;
  status: string;
  reasons: string[];
  costUsd: number;
}

export interface EvalReport {
  cases: CaseResult[];
  passed: number;
  total: number;
  passRate: number;
  totalCostUsd: number;
  criticalFailures: string[];
  gatePassed: boolean;
}

function checkCase(goldenCase: GoldenCase, result: AgentResult): string[] {
  if (result.status !== 'answered' || result.answer === null) {
    return [`status ${result.status}`];
  }
  const cited = citedSources(result.answer);
  const answer = result.answer.toLowerCase();
  return [
    ...goldenCase.expectedSources.filter((id) => !cited.includes(id)).map((id) => `missing source ${id}`),
    ...goldenCase.mustMention.filter((text) => !answer.includes(text.toLowerCase())).map((text) => `missing "${text}"`),
  ];
}

export async function runEvals(cases: GoldenCase[], answer: (question: string) => Promise<AgentResult>, { threshold }: { threshold: number }): Promise<EvalReport> {
  const results: CaseResult[] = [];
  for (const goldenCase of cases) {
    try {
      const result = await answer(goldenCase.question);
      const reasons = checkCase(goldenCase, result);
      results.push({ id: goldenCase.id, pass: reasons.length === 0, status: result.status, reasons, costUsd: result.costUsd });
    } catch (error) {
      results.push({ id: goldenCase.id, pass: false, status: 'error', reasons: [`error: ${(error as Error).message}`], costUsd: 0 });
    }
  }
  const passed = results.filter((result) => result.pass).length;
  const passRate = cases.length === 0 ? 0 : passed / cases.length;
  const criticalFailures = cases.filter((goldenCase, index) => goldenCase.critical && !results[index].pass).map((goldenCase) => goldenCase.id);
  return {
    cases: results,
    passed,
    total: cases.length,
    passRate,
    totalCostUsd: results.reduce((total, result) => total + result.costUsd, 0),
    criticalFailures,
    gatePassed: passRate >= threshold && criticalFailures.length === 0,
  };
}
