import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { GenerateRequest, GenerateResponse } from '@dojo/ai';

export interface ChatModel {
  generate(request: GenerateRequest): Promise<GenerateResponse>;
}

export type TaskStatus = 'pending' | 'done' | 'blocked';

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  attempts: number;
}

export interface SessionOptions {
  model: ChatModel;
  verify(task: Task, output: string): { passed: boolean; feedback: string } | Promise<{ passed: boolean; feedback: string }>;
  sessionId: string;
  maxTasks: number;
  maxAttempts: number;
}

export interface SessionResult {
  completed: string[];
  blocked: string[];
  remaining: number;
}

export const SESSION_SYSTEM = 'You are one session of a long-running coding agent. Work only on the task given, using the progress notes from earlier sessions. Answer with the complete result for that task.';

const PROGRESS_TAIL_LINES = 20;

const tasksPath = (directory: string) => join(directory, 'tasks.json');
const progressPath = (directory: string) => join(directory, 'progress.md');

// TODO: never overwrite an existing tasks.json (return false); otherwise write every task pending with 0 attempts and progress.md starting with "# Progress"
export function initializeProject(directory: string, tasks: Array<{ id: string; title: string }>): boolean {
  mkdirSync(directory, { recursive: true });
  writeFileSync(tasksPath(directory), JSON.stringify(tasks.map(({ id, title }) => ({ id, title, status: 'pending', attempts: 0 }))));
  writeFileSync(progressPath(directory), '# Progress\n');
  return true;
}

export function readTasks(directory: string): Task[] {
  return JSON.parse(readFileSync(tasksPath(directory), 'utf8'));
}

// TODO: the first pending task, or undefined
export function nextTask(tasks: Task[]): Task | undefined {
  return tasks[0];
}

// TODO: up to maxTasks completions; prompt "Task <id>: <title>" plus the last 20 progress lines; verify before done; count attempts and block; save tasks.json atomically after every attempt
export async function runSession(directory: string, { model, verify, sessionId, maxTasks, maxAttempts }: SessionOptions): Promise<SessionResult> {
  const tasks = readTasks(directory);
  const completed: string[] = [];
  for (const task of tasks) {
    await model.generate({ messages: [{ role: 'user', content: `Task ${task.id}: ${task.title}` }] });
    task.status = 'done';
    completed.push(task.id);
    appendFileSync(progressPath(directory), `- [done] ${task.id} (session ${sessionId})\n`);
  }
  writeFileSync(tasksPath(directory), JSON.stringify(tasks));
  return { completed, blocked: [], remaining: 0 };
}
