import { loadPyodide } from 'pyodide';
import { createPythonEngine, type PythonEngine } from './engine';
import type { PythonWorkerRequest, PythonWorkerResponse } from './protocol';

const PYODIDE_URL = new URL(`${import.meta.env.BASE_URL}pyodide/`, self.location.origin).href;

let engine: Promise<PythonEngine> | undefined;

function post(message: PythonWorkerResponse) {
  self.postMessage(message);
}

function startEngine(): Promise<PythonEngine> {
  engine ??= loadPyodide({ indexURL: PYODIDE_URL }).then(createPythonEngine);
  return engine;
}

self.onmessage = async (event: MessageEvent<PythonWorkerRequest>) => {
  const message = event.data;
  let python: PythonEngine;
  try {
    python = await startEngine();
  } catch (error) {
    engine = undefined;
    post({ type: 'failed', message: `Python could not start: ${error instanceof Error ? error.message : String(error)}` });
    return;
  }
  if (message.type === 'warm-up') {
    post({ type: 'ready' });
  }
  if (message.type === 'run-tests') {
    const report = await python.runTests({ files: message.files, entry: message.entry, tests: message.tests });
    post({ type: 'test-report', id: message.id, report });
  }
  if (message.type === 'run') {
    await python.runProgram(message.files, message.entry, (level, text) => post({ type: 'console', id: message.id, level, text }));
    post({ type: 'run-complete', id: message.id });
  }
};
