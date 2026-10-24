import type ts from 'typescript';
import { stripComments, transpile } from './compile';
import { AssertionError, expect, fn } from './expect';
import { jsonResponse, mockApi, resetFakeApi } from './fakeApi';
import { listTestNames } from './testNames';
import { compileProject, evaluateProject, type EvaluatedProject, type ModuleRegistry, type ProjectFiles } from './project';

export interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

export interface RunReport {
  results: TestResult[];
  compileError?: string;
  durationMs: number;
}

export interface RunRequest {
  files: ProjectFiles;
  entry: string;
  tests: string;
}

/**
 * Framework specific pieces plugged into the shared test runner.
 */
export interface FrameworkAdapter {
  registry: ModuleRegistry;
  testFileName: string;
  testTransformers?: ts.TransformerFactory<ts.SourceFile>[];
  compileFile(name: string, code: string): string;
  createScope(project: EvaluatedProject): Record<string, unknown>;
  beforeEach?(): void | Promise<void>;
  afterEach?(): void | Promise<void>;
}

const TEST_TIMEOUT_MS = 4000;

export { listTestNames };

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Formats a thrown value for the learner.
 */
export function errorMessage(error: unknown): string {
  if (error instanceof AssertionError) {
    return error.message;
  }
  if (error instanceof Error) {
    return `${error.name}: ${trimDomDump(error.message)}`;
  }
  return String(error);
}

function trimDomDump(message: string): string {
  const dumpStart = message.search(/\n\n(Ignored nodes:|<body|<div)/);
  return dumpStart === -1 ? message : `${message.slice(0, dumpStart)}\n(DOM output trimmed)`;
}

function withTimeout<T>(promise: Promise<T>, name: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  return Promise.race([
    promise.finally(() => clearTimeout(timer)),
    new Promise<T>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`Test "${name}" timed out after ${TEST_TIMEOUT_MS}ms.`)), TEST_TIMEOUT_MS);
    }),
  ]);
}

/**
 * Compiles a learner project plus its tests and runs every test against a fresh module evaluation.
 */
export async function runTests(adapter: FrameworkAdapter, { files, entry, tests }: RunRequest): Promise<RunReport> {
  const startedAt = performance.now();
  let compiled: Record<string, string>;
  let compiledTests: string;
  try {
    compiled = compileProject(files, adapter.compileFile);
  } catch (error) {
    return { results: [], compileError: errorMessage(error), durationMs: 0 };
  }
  try {
    compiledTests = transpile(tests, { fileName: adapter.testFileName, jsx: 'classic', transformers: adapter.testTransformers });
  } catch (error) {
    return { results: [], compileError: `Test file error: ${errorMessage(error)}`, durationMs: 0 };
  }

  const sources = Object.fromEntries(Object.entries(files).map(([name, code]) => [name, stripComments(code, name)]));
  const names = listTestNames(tests);
  const results: TestResult[] = [];

  for (let index = 0; index < names.length; index++) {
    const registered: Array<{ name: string; run: () => unknown }> = [];
    const register = (name: string, run: () => unknown) => registered.push({ name, run });

    resetFakeApi();
    document.body.innerHTML = '';
    document.title = '';

    try {
      await adapter.beforeEach?.();
      const project = evaluateProject(compiled, entry, adapter.registry);
      const scope: Record<string, unknown> = {
        test: register,
        it: register,
        expect,
        fn,
        sleep,
        mockApi,
        jsonResponse,
        mod: project.entry,
        modules: project.modules,
        require: project.require,
        source: sources[entry],
        sources,
        rawSource: files[entry],
        ...adapter.createScope(project),
      };
      new Function(...Object.keys(scope), compiledTests)(...Object.values(scope));
      const current = registered[index];
      if (!current) {
        throw new Error('Test was not registered. Keep test() calls at the top level of the test file.');
      }
      await withTimeout(Promise.resolve().then(current.run), current.name);
      results.push({ name: current.name, passed: true });
    } catch (error) {
      results.push({ name: registered[index]?.name ?? names[index], passed: false, error: errorMessage(error) });
    } finally {
      try {
        await adapter.afterEach?.();
      } catch {
        document.body.innerHTML = '';
      }
    }
  }

  return { results, durationMs: Math.round(performance.now() - startedAt) };
}
