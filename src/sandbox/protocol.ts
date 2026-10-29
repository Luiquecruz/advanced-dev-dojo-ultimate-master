import type { RunReport } from '../engines/shared/testRunner';
import type { ProjectFiles } from '../engines/shared/project';

export type FrameworkEngine = 'react' | 'vue' | 'angular' | 'node';

export type SandboxRequest =
  | { type: 'preview'; files: ProjectFiles; entry: string }
  | { type: 'run-tests'; id: number; files: ProjectFiles; entry: string; tests: string }
  | { type: 'run'; id: number; files: ProjectFiles; entry: string };

export type SandboxResponse =
  | { type: 'ready' }
  | { type: 'console'; level: 'log' | 'info' | 'warn' | 'error'; text: string }
  | { type: 'test-report'; id: number; report: RunReport }
  | { type: 'run-complete'; id: number };
