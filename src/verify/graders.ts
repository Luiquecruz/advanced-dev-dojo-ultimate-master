import { createRequire } from 'node:module';
import { dirname } from 'node:path';
import { installLoopGuard } from '../engines/shared/compile';
import { installFakeApi } from '../engines/shared/fakeApi';
import { listTestNames, runTests, type FrameworkAdapter, type RunReport, type RunRequest } from '../engines/shared/testRunner';
import type { ProjectFiles } from '../engines/shared/project';
import { createPythonEngine, type PythonEngine } from '../engines/python/engine';
import { listPythonTestNames } from '../engines/python/testNames';

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
      installLoopGuard(globalThis);
      installFakeApi(globalThis, { delay: 5 });
      window.matchMedia ??= (query: string) =>
        ({ matches: false, media: query, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false }) as MediaQueryList;
    },
    listTestNames,
    runTests: (request) => runTests(adapter, request),
    runProgram: adapter.runProgram,
  };
}

/**
 * Grades Python challenges with Pyodide running in Node, loaded once per suite.
 */
export function pythonGrader(): ChallengeGrader {
  let engine: PythonEngine;
  return {
    async setup() {
      const { loadPyodide } = await import('pyodide');
      const indexURL = `${dirname(createRequire(import.meta.url).resolve('pyodide/package.json'))}/`;
      engine = createPythonEngine(await loadPyodide({ indexURL }));
    },
    listTestNames: listPythonTestNames,
    runTests: (request) => engine.runTests(request),
    async runProgram(files, entry) {
      await engine.runProgram(files, entry, (level, text) => (level === 'error' ? console.error(text) : console.log(text)));
    },
  };
}
