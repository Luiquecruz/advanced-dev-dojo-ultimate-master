import type { PyodideAPI } from 'pyodide';
import type { PyProxy } from 'pyodide/ffi';
import { createFakeModelProvider } from '../shared/fakeModel';
import type { ProjectFiles } from '../shared/project';
import type { RunReport, TestResult } from '../shared/testRunner';
import harnessSource from './runtime/dojo_harness.py?raw';
import dojoAiSource from './runtime/dojo_ai/__init__.py?raw';
import dojoAiTestingSource from './runtime/dojo_ai/testing.py?raw';
import { listPythonTestNames } from './testNames';

export type OutputLevel = 'log' | 'error';

/**
 * Progress of a test run, reported before and after each test so a host can stop a test that never returns.
 */
export type PythonTestEvent = { type: 'start'; index: number; name: string } | { type: 'result'; index: number; result: TestResult };

export interface PythonTestRequest {
  files: ProjectFiles;
  entry: string;
  tests: string;
  /** Index of the first test to run; earlier tests are skipped (used to resume after a stopped test). */
  startAt?: number;
  onEvent?: (event: PythonTestEvent) => void;
}

export interface PythonEngine {
  runTests(request: PythonTestRequest): Promise<RunReport>;
  runProgram(files: ProjectFiles, entry: string, onOutput: (level: OutputLevel, text: string) => void): Promise<number>;
}

/**
 * Environment every Pyodide instance starts with: a fixed string hash seed, so set iteration order is the same in the browser and in verification.
 */
export const PYTHON_ENV: Readonly<Record<string, string>> = { PYTHONHASHSEED: '0' };

const RUNTIME_DIRECTORY = '/dojo';
const RUNTIME_FILES: Record<string, string> = {
  'dojo_harness.py': harnessSource,
  'dojo_ai/__init__.py': dojoAiSource,
  'dojo_ai/testing.py': dojoAiTestingSource,
};

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(signal.reason);
    });
  });
}

/**
 * Prepares a loaded Pyodide instance to grade and run learner projects: installs the fake model (`dojo_ai`) and the test harness.
 */
export function createPythonEngine(pyodide: PyodideAPI): PythonEngine {
  const provider = createFakeModelProvider({ wait });
  pyodide.registerJsModule('_dojo_ai_bridge', { ...provider.module, testing: provider.testing, reset: provider.reset });
  for (const [name, source] of Object.entries(RUNTIME_FILES)) {
    const path = `${RUNTIME_DIRECTORY}/${name}`;
    pyodide.FS.mkdirTree(path.slice(0, path.lastIndexOf('/')));
    pyodide.FS.writeFile(path, source);
  }
  pyodide.runPython(`import sys\nif "${RUNTIME_DIRECTORY}" not in sys.path:\n    sys.path.append("${RUNTIME_DIRECTORY}")`);
  const harness = pyodide.pyimport('dojo_harness');

  let output: (level: OutputLevel, text: string) => void = () => undefined;
  pyodide.setStdout({ batched: (text) => output('log', text) });
  pyodide.setStderr({ batched: (text) => output('error', text) });

  return {
    async runTests({ files, entry, tests, startAt = 0, onEvent }) {
      const startedAt = performance.now();
      output = () => undefined;
      const notify = onEvent && ((payload: string) => onEvent(JSON.parse(payload) as PythonTestEvent));
      const outcome: PyProxy = await harness.run_tests(pyodide.toPy(files), entry, tests, pyodide.toPy(listPythonTestNames(tests)), startAt, notify);
      const report = outcome.toJs({ dict_converter: Object.fromEntries }) as Omit<RunReport, 'durationMs'>;
      outcome.destroy();
      return { ...report, durationMs: Math.round(performance.now() - startedAt) };
    },
    async runProgram(files, entry, onOutput) {
      output = onOutput;
      try {
        const code: number = await harness.run_program(pyodide.toPy(files), entry);
        onOutput(code === 0 ? 'log' : 'error', `Process exited with code ${code}`);
        return code;
      } finally {
        output = () => undefined;
      }
    },
  };
}
