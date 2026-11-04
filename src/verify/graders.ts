import { configure as configureTestingLibrary, getConfig as getTestingLibraryConfig } from '@testing-library/dom';
import { installLoopGuard, LOOP_LIMIT_MS } from '../engines/shared/compile';
import { installFakeApi } from '../engines/shared/fakeApi';
import { listTestNames, runTests, TEST_TIMEOUT_MS, type FrameworkAdapter, type RunReport, type RunRequest } from '../engines/shared/testRunner';
import type { ProjectFiles } from '../engines/shared/project';
import { listPythonTestNames } from '../engines/python/testNames';
import { DEFAULT_RUN_TIMEOUT_MS, DEFAULT_TEST_TIMEOUT_MS, PythonSandbox, type PythonSandboxOptions } from './pythonSandbox';
import { scaledBudget } from './timeBudget';

/**
 * How lesson verification grades and runs challenges of one engine.
 */
export interface ChallengeGrader {
  setup?(): void | Promise<void>;
  listTestNames(tests: string): string[];
  runTests(request: RunRequest): Promise<RunReport>;
  runProgram?(files: ProjectFiles, entry: string): Promise<void>;
}

/**
 * Grades framework engine challenges (React, Vue, Angular, Node.js) with the shared JavaScript test runner.
 */
export function frameworkGrader(adapter: FrameworkAdapter): ChallengeGrader {
  return {
    setup() {
      installLoopGuard(globalThis, scaledBudget(LOOP_LIMIT_MS));
      configureTestingLibrary({ asyncUtilTimeout: scaledBudget(getTestingLibraryConfig().asyncUtilTimeout) });
      installFakeApi(globalThis, { delay: 5 });
      window.matchMedia ??= (query: string) =>
        ({ matches: false, media: query, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false }) as MediaQueryList;
    },
    listTestNames,
    runTests: (request) => runTests(adapter, request, { testTimeoutMs: scaledBudget(TEST_TIMEOUT_MS) }),
    runProgram: adapter.runProgram,
  };
}

/**
 * Grades Python challenges with Pyodide in an isolated Node worker (see `pythonSandbox.ts`), started once per suite and restarted after a stopped test.
 */
export function pythonGrader(options: PythonSandboxOptions = {}): ChallengeGrader {
  const sandbox = new PythonSandbox({
    testTimeoutMs: scaledBudget(DEFAULT_TEST_TIMEOUT_MS),
    runTimeoutMs: scaledBudget(DEFAULT_RUN_TIMEOUT_MS),
    ...options,
  });
  return {
    setup: () => sandbox.start(),
    listTestNames: listPythonTestNames,
    runTests: (request) => sandbox.runTests(request),
    async runProgram(files, entry) {
      await sandbox.runProgram(files, entry, (level, text) => (level === 'error' ? console.error(text) : console.log(text)));
    },
  };
}
