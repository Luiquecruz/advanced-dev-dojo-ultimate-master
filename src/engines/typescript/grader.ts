import type { ChallengeTest, GradeResult, PatternTest, RuntimeOutcome, RuntimeTest, StaticAnalysis, TestResult, TypeTest } from './types';

export interface SplitTests {
  typeTests: TypeTest[];
  runtimeTests: RuntimeTest[];
  patternTests: PatternTest[];
}

export function splitTests(tests: ChallengeTest[]): SplitTests {
  return {
    typeTests: tests.filter((test): test is TypeTest => test.kind === 'type'),
    runtimeTests: tests.filter((test): test is RuntimeTest => test.kind === 'runtime'),
    patternTests: tests.filter((test): test is PatternTest => test.kind === 'pattern'),
  };
}

/**
 * Merges static and runtime outcomes into the declared test order.
 */
export function combineResults(tests: ChallengeTest[], analysis: StaticAnalysis, runtime: RuntimeOutcome): GradeResult {
  const queues: Record<'type' | 'runtime' | 'pattern', TestResult[]> = {
    type: [...analysis.typeTests],
    runtime: [...runtime.results],
    pattern: [...analysis.patternTests],
  };
  const ordered = tests.map((test): TestResult => queues[test.kind].shift() ?? { name: test.name, kind: test.kind, passed: false, message: 'Test did not run.' });
  const results = [analysis.compileTest, ...ordered];
  return {
    passed: results.every((test) => test.passed),
    tests: results,
    diagnostics: analysis.diagnostics,
    logs: runtime.logs,
  };
}
