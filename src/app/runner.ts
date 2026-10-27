import type { Challenge, EngineId, ProjectFiles } from '../content';
import { listTestNames } from '../engines/shared/testNames';
import type { RunReport } from '../engines/shared/testRunner';
import { gradeInBrowser, runCode } from '../engines/typescript/browserGrader';
import { parseTypeScriptTests } from '../engines/typescript/testsDsl';
import type { SandboxRequest, SandboxResponse } from '../sandbox/protocol';

export interface TestOutcome {
  name: string;
  passed: boolean;
  message?: string;
}

export interface Report {
  passed: boolean;
  tests: TestOutcome[];
  compileError?: string;
  logs: string[];
  durationMs?: number;
}

const COMPILE_TEST_NAME = 'Your code compiles without type errors';
const SANDBOX_TIMEOUT_MS = 45000;

/**
 * Names of the tests a challenge will run, shown before the first run.
 */
export function testNamesFor(engine: EngineId, challenge: Challenge): string[] {
  if (engine === 'typescript') {
    return [COMPILE_TEST_NAME, ...parseTypeScriptTests(challenge.tests).map((test) => test.name)];
  }
  return listTestNames(challenge.tests);
}

/**
 * URL of the sandbox page for a framework track.
 */
export function sandboxUrl(engine: EngineId, mode: 'preview' | 'test'): string {
  return `${import.meta.env.BASE_URL}sandbox.html?engine=${engine}&mode=${mode}`;
}

let nextRequestId = 1;

function runInSandbox(engine: EngineId, files: ProjectFiles, entry: string, tests: string): Promise<RunReport> {
  return new Promise((resolve) => {
    const iframe = document.createElement('iframe');
    iframe.className = 'pointer-events-none fixed top-0 -left-[10000px] h-[768px] w-[1024px] border-none opacity-0';
    iframe.setAttribute('aria-hidden', 'true');
    iframe.src = sandboxUrl(engine, 'test');
    const id = nextRequestId++;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const finish = (report: RunReport) => {
      clearTimeout(timer);
      window.removeEventListener('message', onMessage);
      iframe.remove();
      previouslyFocused?.focus();
      resolve(report);
    };

    const onMessage = (event: MessageEvent<SandboxResponse>) => {
      if (event.source !== iframe.contentWindow) {
        return;
      }
      if (event.data.type === 'ready') {
        const request: SandboxRequest = { type: 'run-tests', id, files, entry, tests };
        iframe.contentWindow?.postMessage(request, location.origin);
      }
      if (event.data.type === 'test-report' && event.data.id === id) {
        finish(event.data.report);
      }
    };

    const timer = setTimeout(
      () => finish({ results: [], compileError: 'The test run took too long and was stopped. Check for infinite loops or promises that never settle.', durationMs: SANDBOX_TIMEOUT_MS }),
      SANDBOX_TIMEOUT_MS,
    );
    window.addEventListener('message', onMessage);
    document.body.appendChild(iframe);
  });
}

/**
 * Grades learner files against the challenge tests with the engine of the track.
 */
export async function gradeChallenge(engine: EngineId, challenge: Challenge, files: ProjectFiles): Promise<Report> {
  if (engine === 'typescript') {
    const result = await gradeInBrowser(parseTypeScriptTests(challenge.tests), files[challenge.entry]);
    return {
      passed: result.passed,
      tests: result.tests.map((test) => ({ name: test.name, passed: test.passed, message: test.message })),
      logs: result.logs,
    };
  }
  const report = await runInSandbox(engine, files, challenge.entry, challenge.tests);
  const tests = report.results.map((result) => ({ name: result.name, passed: result.passed, message: result.error }));
  return {
    passed: !report.compileError && tests.length > 0 && tests.every((test) => test.passed),
    tests,
    compileError: report.compileError,
    logs: [],
    durationMs: report.durationMs,
  };
}

/**
 * Runs TypeScript track code and returns its console output.
 */
export function runTypeScript(code: string): Promise<string[]> {
  return runCode(code);
}
