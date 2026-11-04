import type { ProjectFiles } from '../shared/project';
import type { RunReport } from '../shared/testRunner';
import type { OutputLevel } from './engine';

export type PythonWorkerRequest =
  | { type: 'warm-up' }
  | { type: 'run-tests'; id: number; files: ProjectFiles; entry: string; tests: string }
  | { type: 'run'; id: number; files: ProjectFiles; entry: string };

export type PythonWorkerResponse =
  | { type: 'ready' }
  | { type: 'failed'; message: string }
  | { type: 'test-report'; id: number; report: RunReport }
  | { type: 'console'; id: number; level: OutputLevel; text: string }
  | { type: 'run-complete'; id: number };
