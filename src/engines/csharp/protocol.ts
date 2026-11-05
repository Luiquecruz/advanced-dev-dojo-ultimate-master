import type { ProjectFiles } from '../shared/project';
import type { RunReport, TestResult } from '../shared/testRunner';

export type OutputLevel = 'log' | 'error';

/**
 * Progress of a test run, reported by the host before and after each test so the client can stop a test that never returns.
 * The shape of `PythonTestEvent`, plus `total`: the number of tests the host discovered, which a resumed run counts to.
 */
export type CsharpTestEvent = { type: 'start'; index: number; total: number; name: string } | { type: 'result'; index: number; result: TestResult };

/** An event the host emits through the `dojo-host` `emit` import while code runs. */
export type CsharpHostEvent = CsharpTestEvent | { type: 'console'; level: OutputLevel; text: string };

/** A Roslyn diagnostic (errors and warnings), 1-based positions. */
export interface CsharpDiagnostic {
  file: string;
  line: number;
  column: number;
  endLine: number;
  endColumn: number;
  severity: 'error' | 'warning';
  code: string;
  message: string;
}

export interface CsharpReport extends RunReport {
  diagnostics: CsharpDiagnostic[];
}

export interface CsharpProgramReport {
  exitCode: number;
  diagnostics: CsharpDiagnostic[];
  compileError?: string;
  error?: string;
}

/** Requests carry an unguessable id (`crypto.randomUUID()`), so a forged response cannot name the current request. */
export type CsharpWorkerRequest =
  | { type: 'boot' }
  | { type: 'run-tests'; id: string; files: ProjectFiles; tests: string; startAt: number }
  | { type: 'run'; id: string; files: ProjectFiles };

export type CsharpWorkerResponse =
  | { type: 'ready'; bootMs: number; warmMs: number }
  | { type: 'failed'; message: string }
  | { type: 'test-event'; id: string; event: CsharpTestEvent }
  | { type: 'test-report'; id: string; report: CsharpReport }
  | { type: 'console'; id: string; level: OutputLevel; text: string }
  | { type: 'run-complete'; id: string; exitCode: number };

type Json = Record<string, unknown>;

function object(value: unknown, what: string): Json {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`The C# host sent a malformed ${what}.`);
  }
  return value as Json;
}

function text(value: unknown, what: string): string {
  if (typeof value !== 'string') {
    throw new Error(`The C# host sent a malformed ${what}.`);
  }
  return value;
}

function integer(value: unknown, what: string): number {
  if (!Number.isInteger(value)) {
    throw new Error(`The C# host sent a malformed ${what}.`);
  }
  return value as number;
}

function testResult(value: unknown): TestResult {
  const result = object(value, 'test result');
  if (typeof result.passed !== 'boolean') {
    throw new Error('The C# host sent a malformed test result.');
  }
  const error = result.error === undefined ? {} : { error: text(result.error, 'test result') };
  return { name: text(result.name, 'test result'), passed: result.passed, ...error };
}

function diagnostics(value: unknown): CsharpDiagnostic[] {
  if (!Array.isArray(value)) {
    throw new Error('The C# host sent malformed diagnostics.');
  }
  return value.map((item) => {
    const diagnostic = object(item, 'diagnostic');
    const severity = diagnostic.severity === 'error' || diagnostic.severity === 'warning' ? diagnostic.severity : 'error';
    return {
      file: diagnostic.file === null ? '' : text(diagnostic.file, 'diagnostic'),
      line: integer(diagnostic.line, 'diagnostic'),
      column: integer(diagnostic.column, 'diagnostic'),
      endLine: integer(diagnostic.endLine, 'diagnostic'),
      endColumn: integer(diagnostic.endColumn, 'diagnostic'),
      severity,
      code: text(diagnostic.code, 'diagnostic'),
      message: text(diagnostic.message, 'diagnostic'),
    };
  });
}

/**
 * Reads one host event (`emit` payload): test start, test result or a console line.
 */
export function parseHostEvent(payload: string): CsharpHostEvent {
  const event = object(JSON.parse(payload), 'event');
  if (event.type === 'start') {
    return { type: 'start', index: integer(event.index, 'event'), total: integer(event.total, 'event'), name: text(event.name, 'event') };
  }
  if (event.type === 'result') {
    return { type: 'result', index: integer(event.index, 'event'), result: testResult(event.result) };
  }
  if (event.type === 'console') {
    return { type: 'console', level: event.level === 'error' ? 'error' : 'log', text: text(event.text, 'event') };
  }
  throw new Error('The C# host sent an unknown event.');
}

/**
 * Reads the JSON report of `DojoHost.RunTests`; `durationMs` is the caller's wall clock when given.
 */
export function parseTestReport(payload: string, durationMs?: number): CsharpReport {
  const report = object(JSON.parse(payload), 'test report');
  if (!Array.isArray(report.results)) {
    throw new Error('The C# host sent a malformed test report.');
  }
  const compileError = report.compileError === undefined ? {} : { compileError: text(report.compileError, 'test report') };
  return {
    results: report.results.map(testResult),
    ...compileError,
    diagnostics: diagnostics(report.diagnostics),
    durationMs: durationMs ?? integer(report.durationMs, 'test report'),
  };
}

/**
 * Why a test report cannot be trusted, or undefined when it can: its results must be the result events watched during the run, in
 * order, and name the tests listed from tests.cs from `startAt` on. Without the check, a forged report could drop failing tests.
 */
export function reportMismatch(report: RunReport, observed: TestResult[], names: string[], startAt: number): string | undefined {
  const describe = (results: TestResult[]) => JSON.stringify(results.map(({ name, passed }) => [name, passed]));
  if (describe(report.results) !== describe(observed)) {
    return 'The C# test report does not match the tests that ran, so the run was discarded.';
  }
  if (report.compileError === undefined && JSON.stringify(report.results.map(({ name }) => name)) !== JSON.stringify(names.slice(startAt))) {
    return 'The C# test report does not list the tests in tests.cs (test names must be string literals), so the run was discarded.';
  }
  return undefined;
}

/**
 * Reads the JSON report of `DojoHost.RunProgram`.
 */
export function parseProgramReport(payload: string): CsharpProgramReport {
  const report = object(JSON.parse(payload), 'program report');
  return {
    exitCode: integer(report.exitCode, 'program report'),
    diagnostics: diagnostics(report.diagnostics),
    ...(report.compileError === undefined ? {} : { compileError: text(report.compileError, 'program report') }),
    ...(report.error === undefined ? {} : { error: text(report.error, 'program report') }),
  };
}
