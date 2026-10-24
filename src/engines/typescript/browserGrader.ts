import { combineResults, splitTests } from './grader';
import type { StaticAnalysisRequest } from './staticAnalysis';
import type { ChallengeTest, GradeResult, RuntimeOutcome, RuntimeTest, StaticAnalysis } from './types';

const RUNTIME_BASE_TIMEOUT_MS = 3000;
const RUNTIME_TIMEOUT_PER_TEST_MS = 2000;

type AnalysisResponse = { requestId: number; analysis: StaticAnalysis } | { requestId: number; error: string };

let analysisWorker: Worker | undefined;
let nextRequestId = 0;
const pendingAnalyses = new Map<number, { resolve: (analysis: StaticAnalysis) => void; reject: (error: Error) => void }>();

function getAnalysisWorker(): Worker {
  if (analysisWorker) {
    return analysisWorker;
  }
  analysisWorker = new Worker(new URL('./analysis.worker.ts', import.meta.url), { type: 'module' });
  analysisWorker.onmessage = (event: MessageEvent<AnalysisResponse>) => {
    const pending = pendingAnalyses.get(event.data.requestId);
    pendingAnalyses.delete(event.data.requestId);
    if ('error' in event.data) {
      pending?.reject(new Error(event.data.error));
      return;
    }
    pending?.resolve(event.data.analysis);
  };
  return analysisWorker;
}

function analyze(request: StaticAnalysisRequest): Promise<StaticAnalysis> {
  const requestId = nextRequestId++;
  return new Promise((resolve, reject) => {
    pendingAnalyses.set(requestId, { resolve, reject });
    getAnalysisWorker().postMessage({ requestId, request });
  });
}

function runInSandbox(javascript: string, tests: RuntimeTest[]): Promise<RuntimeOutcome> {
  const worker = new Worker(new URL('./runtime.worker.ts', import.meta.url), { type: 'module' });
  const timeoutMs = RUNTIME_BASE_TIMEOUT_MS + tests.length * RUNTIME_TIMEOUT_PER_TEST_MS;
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      worker.terminate();
      resolve({
        logs: ['✖ Execution stopped: your code took too long. Check for infinite loops or unresolved promises.'],
        results: tests.map((test) => ({ name: test.name, kind: 'runtime', passed: false, message: 'Execution timed out.' })),
      });
    }, timeoutMs);
    worker.onmessage = (event: MessageEvent<RuntimeOutcome>) => {
      clearTimeout(timer);
      worker.terminate();
      resolve(event.data);
    };
    worker.postMessage({ javascript, tests });
  });
}

/**
 * Starts the analysis worker ahead of time so the first grading is fast.
 */
export function warmUpGrader(): void {
  void analyze({ code: '', typeTests: [], patternTests: [] });
}

export async function gradeInBrowser(tests: ChallengeTest[], code: string): Promise<GradeResult> {
  const { typeTests, runtimeTests, patternTests } = splitTests(tests);
  const analysis = await analyze({ code, typeTests, patternTests });
  const runtime = await runInSandbox(analysis.javascript, runtimeTests);
  return combineResults(tests, analysis, runtime);
}

export async function runCode(code: string): Promise<string[]> {
  const analysis = await analyze({ code, typeTests: [], patternTests: [] });
  const runtime = await runInSandbox(analysis.javascript, []);
  return runtime.logs;
}
