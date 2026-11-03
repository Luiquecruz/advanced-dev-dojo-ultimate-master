import { ModelError } from '@dojo/ai';
import type { GenerateRequest, GenerateResponse } from '@dojo/ai';

export interface ChatModel {
  generate(request: GenerateRequest): Promise<GenerateResponse>;
}

export interface Subtask {
  id: string;
  instruction: string;
}

export interface WorkerResult {
  id: string;
  status: 'ok' | 'failed';
  output: string | null;
  error: string | null;
}

export interface UsageTotals {
  calls: number;
  inputTokens: number;
  outputTokens: number;
  cost: number;
}

export interface OrchestratorOptions {
  model: ChatModel;
  maxSubtasks: number;
  concurrency: number;
  maxPlanAttempts: number;
}

export interface OrchestratorResult {
  answer: string | null;
  plan: Subtask[];
  results: WorkerResult[];
  usage: UsageTotals;
}

export const PLANNER_SYSTEM =
  'You are the lead researcher. Split the question into independent subtasks a worker can research alone. Reply with JSON only: {"subtasks": [{"id": "...", "instruction": "..."}]}.';
export const WORKER_SYSTEM = 'You are a research worker. Complete only the subtask you are given and reply with concise findings.';
export const SYNTHESIZER_SYSTEM = 'You are the lead researcher. Combine the worker findings into one answer to the question. Say which subtasks failed.';

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

export function parsePlan(text: string, maxSubtasks: number): Subtask[] | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
  const subtasks = (parsed as { subtasks?: unknown }).subtasks;
  if (!Array.isArray(subtasks) || subtasks.length === 0) {
    return null;
  }
  const plan: Subtask[] = [];
  const ids = new Set<string>();
  for (const subtask of subtasks) {
    if (!isNonEmptyString(subtask?.id) || !isNonEmptyString(subtask?.instruction) || ids.has(subtask.id)) {
      return null;
    }
    ids.add(subtask.id);
    plan.push({ id: subtask.id, instruction: subtask.instruction });
  }
  return plan.slice(0, maxSubtasks);
}

export async function runWithConcurrency<Item, Result>(items: Item[], limit: number, run: (item: Item, index: number) => Promise<Result>): Promise<Result[]> {
  const results = new Array<Result>(items.length);
  let next = 0;
  const lane = async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await run(items[index], index);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, lane));
  return results;
}

function emptyUsage(): UsageTotals {
  return { calls: 0, inputTokens: 0, outputTokens: 0, cost: 0 };
}

function addUsage(totals: UsageTotals, response: GenerateResponse): void {
  totals.calls += 1;
  totals.inputTokens += response.usage.inputTokens;
  totals.outputTokens += response.usage.outputTokens;
  totals.cost += response.usage.cost;
}

async function plan(question: string, { model, maxSubtasks, maxPlanAttempts }: OrchestratorOptions, usage: UsageTotals): Promise<Subtask[]> {
  for (let attempt = 1; attempt <= maxPlanAttempts; attempt++) {
    try {
      const response = await model.generate({
        messages: [
          { role: 'system', content: PLANNER_SYSTEM },
          { role: 'user', content: `Question: ${question}\nUse at most ${maxSubtasks} subtasks.` },
        ],
        responseFormat: { type: 'json' },
      });
      addUsage(usage, response);
      const subtasks = parsePlan(response.text, maxSubtasks);
      if (subtasks !== null) {
        return subtasks;
      }
    } catch (error) {
      if (!(error instanceof ModelError)) {
        throw error;
      }
    }
  }
  return [{ id: 'task-1', instruction: question }];
}

async function work(model: ChatModel, subtask: Subtask, usage: UsageTotals): Promise<WorkerResult> {
  try {
    const response = await model.generate({
      messages: [
        { role: 'system', content: WORKER_SYSTEM },
        { role: 'user', content: subtask.instruction },
      ],
    });
    addUsage(usage, response);
    if (response.finishReason !== 'stop' || response.text.trim() === '') {
      return { id: subtask.id, status: 'failed', output: null, error: response.finishReason };
    }
    return { id: subtask.id, status: 'ok', output: response.text, error: null };
  } catch (error) {
    if (error instanceof ModelError) {
      return { id: subtask.id, status: 'failed', output: null, error: error.code };
    }
    throw error;
  }
}

function synthesisPrompt(question: string, results: WorkerResult[]): string {
  const findings = results.filter((result) => result.status === 'ok').map((result) => `[${result.id}]\n${result.output}`);
  const failed = results.filter((result) => result.status === 'failed').map((result) => result.id);
  const failedLine = failed.length === 0 ? 'Failed subtasks: none' : `Failed subtasks: ${failed.join(', ')}`;
  return `Question: ${question}\n\nFindings:\n${findings.join('\n\n')}\n\n${failedLine}`;
}

export async function orchestrate(question: string, options: OrchestratorOptions): Promise<OrchestratorResult> {
  const usage = emptyUsage();
  const subtasks = await plan(question, options, usage);
  const results = await runWithConcurrency(subtasks, options.concurrency, (subtask) => work(options.model, subtask, usage));
  if (results.every((result) => result.status === 'failed')) {
    return { answer: null, plan: subtasks, results, usage };
  }
  const synthesis = await options.model.generate({
    messages: [
      { role: 'system', content: SYNTHESIZER_SYSTEM },
      { role: 'user', content: synthesisPrompt(question, results) },
    ],
  });
  addUsage(usage, synthesis);
  return { answer: synthesis.text, plan: subtasks, results, usage };
}
