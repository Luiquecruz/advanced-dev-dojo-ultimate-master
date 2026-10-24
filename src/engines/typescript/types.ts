export type Difficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert';

/**
 * Compiles the snippet appended after the learner code. Fails when the snippet produces a type error.
 * Use `Expect<Equal<A, B>>` for type equality and `// @ts-expect-error` for code that must not compile.
 */
export interface TypeTest {
  kind: 'type';
  name: string;
  code: string;
}

/**
 * Runs JavaScript after the learner code is transpiled. Fails when the code throws or returns `false`.
 * Exposes `assert` and every top-level declaration of the learner code.
 */
export interface RuntimeTest {
  kind: 'runtime';
  name: string;
  code: string;
}

/**
 * Matches a regular expression against the learner code with comments removed.
 */
export interface PatternTest {
  kind: 'pattern';
  name: string;
  pattern: string;
  flags?: string;
  mustMatch: boolean;
}

export type ChallengeTest = TypeTest | RuntimeTest | PatternTest;

export interface CodeDiagnostic {
  line: number;
  column: number;
  message: string;
  code: number;
}

export type TestKind = ChallengeTest['kind'] | 'compile';

export interface TestResult {
  name: string;
  kind: TestKind;
  passed: boolean;
  message?: string;
}

export interface GradeResult {
  passed: boolean;
  tests: TestResult[];
  diagnostics: CodeDiagnostic[];
  logs: string[];
}

export interface StaticAnalysis {
  diagnostics: CodeDiagnostic[];
  compileTest: TestResult;
  typeTests: TestResult[];
  patternTests: TestResult[];
  javascript: string;
}

export interface RuntimeOutcome {
  results: TestResult[];
  logs: string[];
}
