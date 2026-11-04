import type { ProjectFiles } from '../shared/project';
import type { RunReport } from '../shared/testRunner';
import type { OutputLevel, PythonTestEvent } from './engine';

export type PythonWorkerRequest =
  | { type: 'make-snapshot' }
  | { type: 'boot'; snapshot?: Uint8Array; packages?: string[] }
  | { type: 'run-tests'; id: number; files: ProjectFiles; entry: string; tests: string; startAt: number }
  | { type: 'run'; id: number; files: ProjectFiles; entry: string };

export type PythonWorkerResponse =
  | { type: 'snapshot'; bytes: Uint8Array }
  | { type: 'ready' }
  | { type: 'failed'; message: string }
  | { type: 'test-event'; id: number; event: PythonTestEvent }
  | { type: 'test-report'; id: number; report: RunReport }
  | { type: 'console'; id: number; level: OutputLevel; text: string }
  | { type: 'run-complete'; id: number };
