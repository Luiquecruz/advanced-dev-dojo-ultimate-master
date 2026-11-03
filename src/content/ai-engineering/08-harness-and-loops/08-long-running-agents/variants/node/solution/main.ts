import { appendFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
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

export function initializeProject(directory: string, tasks: Array<{ id: string; title: string }>): boolean {
  if (existsSync(tasksPath(directory))) {
    return false;
  }
  mkdirSync(directory, { recursive: true });
  writeFileSync(tasksPath(directory), JSON.stringify(tasks.map(({ id, title }) => ({ id, title, status: 'pending', attempts: 0 })), null, 2));
  writeFileSync(progressPath(directory), '# Progress\n');
  return true;
}

export function readTasks(directory: string): Task[] {
  return JSON.parse(readFileSync(tasksPath(directory), 'utf8'));
}

export function nextTask(tasks: Task[]): Task | undefined {
  return tasks.find((task) => task.status === 'pending');
}

function saveTasks(directory: string, tasks: Task[]): void {
  const temporary = `${tasksPath(directory)}.tmp`;
  writeFileSync(temporary, JSON.stringify(tasks, null, 2));
  renameSync(temporary, tasksPath(directory));
}

function appendProgress(directory: string, line: string): void {
  appendFileSync(progressPath(directory), `${line}\n`);
}

function progressTail(directory: string): string {
  const lines = readFileSync(progressPath(directory), 'utf8').split('\n').filter((line) => line.trim() !== '');
  return lines.slice(-PROGRESS_TAIL_LINES).join('\n');
}

export async function runSession(directory: string, { model, verify, sessionId, maxTasks, maxAttempts }: SessionOptions): Promise<SessionResult> {
  const tasks = readTasks(directory);
  const completed: string[] = [];
  const blocked: string[] = [];
  for (let task = nextTask(tasks); task !== undefined && completed.length < maxTasks; task = nextTask(tasks)) {
    const response = await model.generate({
      messages: [
        { role: 'system', content: SESSION_SYSTEM },
        { role: 'user', content: `Task ${task.id}: ${task.title}\n\nProgress so far:\n${progressTail(directory)}` },
      ],
    });
    const verdict = await verify({ ...task }, response.text);
    if (verdict.passed) {
      task.status = 'done';
      completed.push(task.id);
      appendProgress(directory, `- [done] ${task.id} (session ${sessionId})`);
    } else {
      task.attempts += 1;
      appendProgress(directory, `- [retry] ${task.id}: ${verdict.feedback}`);
      if (task.attempts >= maxAttempts) {
        task.status = 'blocked';
        blocked.push(task.id);
        appendProgress(directory, `- [blocked] ${task.id}`);
      }
    }
    saveTasks(directory, tasks);
  }
  return { completed, blocked, remaining: tasks.filter((candidate) => candidate.status === 'pending').length };
}
