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

export async function runEvals(cases: GoldenCase[], answer: (question: string) => Promise<AgentResult>, { threshold }: { threshold: number }): Promise<EvalReport> {
  // TODO: run each case in order; a case passes when answered, citing every expected source and mentioning every required text; errors are failed cases; gate on threshold and critical cases
  const results: CaseResult[] = [];
  for (const goldenCase of cases) {
    const result = await answer(goldenCase.question);
    results.push({ id: goldenCase.id, pass: result.status === 'answered', status: result.status, reasons: [], costUsd: result.costUsd });
  }
  const passed = results.filter((result) => result.pass).length;
  return { cases: results, passed, total: cases.length, passRate: passed / cases.length, totalCostUsd: 0, criticalFailures: [], gatePassed: passed / cases.length >= threshold };
}
