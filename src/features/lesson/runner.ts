import type { Challenge, EngineId, ProjectFiles } from '@/content';
import { disposeCsharp, gradeCsharp, listCsharpTestNames, runCsharp, warmUpCsharp } from '@/engines/csharp';
import { gradePython, runPython, warmUpPython } from '@/engines/python/browserClient';
import { listPythonTestNames } from '@/engines/python/testNames';
import { listTestNames } from '@/engines/shared/testNames';
import type { RunReport } from '@/engines/shared/testRunner';
import { gradeInBrowser, runCode } from '@/engines/typescript/browserGrader';
import { parseTypeScriptTests } from '@/engines/typescript/testsDsl';
import { measure, reportProblem } from '@/shared/monitoring/monitoring';
import type { SandboxRequest, SandboxResponse } from '@/sandbox/protocol';
import type { ConsoleEntry } from './PreviewFrame';

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
const RUN_TIMEOUT_MS = 15000;
const RUNNABLE_ENGINES = new Set<EngineId>(['typescript', 'node', 'python', 'csharp']);

/**
 * Names of the tests a challenge will run, shown before the first run.
 */
export function testNamesFor(engine: EngineId, challenge: Challenge): string[] {
  if (engine === 'typescript') {
    return [COMPILE_TEST_NAME, ...parseTypeScriptTests(challenge.tests).map((test) => test.name)];
  }
  if (engine === 'python') {
    return listPythonTestNames(challenge.tests);
  }
  if (engine === 'csharp') {
    return listCsharpTestNames(challenge.tests);
  }
  return listTestNames(challenge.tests);
}

/**
 * Starts the engine of the open challenge ahead of its first run when it needs a slow download (Python, C#). `undefined` (a theory
 * or quiz lesson, or the lesson screen closing) starts nothing and releases the C# runtime kept warm for the next run.
 */
export function prepareEngine(engine: EngineId | undefined): void {
  if (engine === 'python') {
    warmUpPython();
  }
  if (engine === 'csharp') {
    warmUpCsharp();
  } else {
    disposeCsharp();
  }
}

/**
 * URL of the sandbox page for a framework track.
 */
export function sandboxUrl(engine: EngineId, mode: 'preview' | 'test' | 'run'): string {
  return `${import.meta.env.BASE_URL}sandbox.html?engine=${engine}&mode=${mode}`;
}

let nextRequestId = 1;

function createHiddenSandbox(engine: EngineId, mode: 'test' | 'run'): HTMLIFrameElement {
  const iframe = document.createElement('iframe');
  iframe.className = 'pointer-events-none fixed top-0 -left-[10000px] h-[768px] w-[1024px] border-none opacity-0';
  iframe.setAttribute('aria-hidden', 'true');
  iframe.src = sandboxUrl(engine, mode);
  return iframe;
}

function reportSandboxNotReady(engine: EngineId, mode: 'test' | 'run'): void {
  reportProblem('Sandbox did not load', 'error', { engine, mode });
}

function runInSandbox(engine: EngineId, files: ProjectFiles, entry: string, tests: string): Promise<RunReport> {
  return new Promise((resolve) => {
    const iframe = createHiddenSandbox(engine, 'test');
    const id = nextRequestId++;
    let loaded = false;

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
        loaded = true;
        const request: SandboxRequest = { type: 'run-tests', id, files, entry, tests };
        iframe.contentWindow?.postMessage(request, location.origin);
      }
      if (event.data.type === 'test-report' && event.data.id === id) {
        finish(event.data.report);
      }
    };

    const timer = setTimeout(() => {
      if (!loaded) {
        reportSandboxNotReady(engine, 'test');
      }
      finish({ results: [], compileError: 'The test run took too long and was stopped. Check for infinite loops or promises that never settle.', durationMs: SANDBOX_TIMEOUT_MS });
    }, SANDBOX_TIMEOUT_MS);
    window.addEventListener('message', onMessage);
    document.body.appendChild(iframe);
  });
}

function gradeWithEngine(engine: EngineId, challenge: Challenge, files: ProjectFiles): Promise<RunReport> {
  if (engine === 'python') {
    return gradePython(files, challenge.entry, challenge.tests);
  }
  if (engine === 'csharp') {
    return gradeCsharp(files, challenge.tests);
  }
  return runInSandbox(engine, files, challenge.entry, challenge.tests);
}

/**
 * Grades learner files against the challenge tests with the engine of the track.
 */
export function gradeChallenge(engine: EngineId, challenge: Challenge, files: ProjectFiles): Promise<Report> {
  return measure('Run tests', 'engine.grade', { engine }, () => grade(engine, challenge, files));
}

async function grade(engine: EngineId, challenge: Challenge, files: ProjectFiles): Promise<Report> {
  if (engine === 'typescript') {
    const result = await gradeInBrowser(parseTypeScriptTests(challenge.tests), files[challenge.entry]);
    return {
      passed: result.passed,
      tests: result.tests.map((test) => ({ name: test.name, passed: test.passed, message: test.message })),
      logs: result.logs,
    };
  }
  const report = await gradeWithEngine(engine, challenge, files);
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
 * Whether the track has a Run button that executes the entry file and prints its console output.
 */
export function canRunProgram(engine: EngineId): boolean {
  return RUNNABLE_ENGINES.has(engine);
}

function levelOf(text: string): ConsoleEntry['level'] {
  return text.startsWith('✖') ? 'error' : text.startsWith('⚠') ? 'warn' : 'log';
}

function runNodeInSandbox(engine: EngineId, files: ProjectFiles, entry: string, onConsole: (entry: ConsoleEntry) => void): Promise<void> {
  return new Promise((resolve) => {
    const iframe = createHiddenSandbox(engine, 'run');
    const id = nextRequestId++;
    let loaded = false;
    const finish = () => {
      clearTimeout(timer);
      window.removeEventListener('message', onMessage);
      iframe.remove();
      resolve();
    };
    const onMessage = (event: MessageEvent<SandboxResponse>) => {
      if (event.source !== iframe.contentWindow) {
        return;
      }
      if (event.data.type === 'ready') {
        loaded = true;
        const request: SandboxRequest = { type: 'run', id, files, entry };
        iframe.contentWindow?.postMessage(request, location.origin);
      }
      if (event.data.type === 'console') {
        onConsole({ level: event.data.level, text: event.data.text });
      }
      if (event.data.type === 'run-complete' && event.data.id === id) {
        finish();
      }
    };
    const timer = setTimeout(() => {
      if (!loaded) {
        reportSandboxNotReady(engine, 'run');
      }
      onConsole({ level: 'error', text: 'The program took too long and was stopped. Check for infinite loops.' });
      finish();
    }, RUN_TIMEOUT_MS);
    window.addEventListener('message', onMessage);
    document.body.appendChild(iframe);
  });
}

/**
 * Runs the entry file of a challenge and streams its console output.
 */
export function runProgram(engine: EngineId, files: ProjectFiles, entry: string, onConsole: (entry: ConsoleEntry) => void): Promise<void> {
  return measure('Run program', 'engine.run', { engine }, () => run(engine, files, entry, onConsole));
}

async function run(engine: EngineId, files: ProjectFiles, entry: string, onConsole: (entry: ConsoleEntry) => void): Promise<void> {
  if (engine === 'typescript') {
    const logs = await runCode(files[entry]);
    logs.forEach((text) => onConsole({ level: levelOf(text), text }));
    return;
  }
  if (engine === 'python') {
    await runPython(files, entry, (level, text) => onConsole({ level, text }));
    return;
  }
  if (engine === 'csharp') {
    await runCsharp(files, (level, text) => onConsole({ level, text }));
    return;
  }
  await runNodeInSandbox(engine, files, entry, onConsole);
}
