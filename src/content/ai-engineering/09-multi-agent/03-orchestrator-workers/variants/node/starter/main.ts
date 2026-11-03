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

// TODO: extract the JSON object (fences, prose), validate every subtask, keep at most maxSubtasks, return null when unusable
export function parsePlan(text: string, maxSubtasks: number): Subtask[] | null {
  return JSON.parse(text).subtasks;
}

// TODO: run at most `limit` items at once and keep the results in input order
export async function runWithConcurrency<Item, Result>(items: Item[], limit: number, run: (item: Item, index: number) => Promise<Result>): Promise<Result[]> {
  return Promise.all(items.map((item, index) => run(item, index)));
}

// TODO: re-plan on unusable plans (fallback to one subtask), contain worker failures, skip synthesis when every worker failed, sum the usage of every response
export async function orchestrate(question: string, { model, maxSubtasks, concurrency }: OrchestratorOptions): Promise<OrchestratorResult> {
  const planResponse = await model.generate({
    messages: [
      { role: 'system', content: PLANNER_SYSTEM },
      { role: 'user', content: `Question: ${question}\nUse at most ${maxSubtasks} subtasks.` },
    ],
    responseFormat: { type: 'json' },
  });
  const plan = parsePlan(planResponse.text, maxSubtasks) ?? [];
  const results = await runWithConcurrency(plan, concurrency, async (subtask): Promise<WorkerResult> => {
    const response = await model.generate({
      messages: [
        { role: 'system', content: WORKER_SYSTEM },
        { role: 'user', content: subtask.instruction },
      ],
    });
    return { id: subtask.id, status: 'ok', output: response.text, error: null };
  });
  const synthesis = await model.generate({
    messages: [
      { role: 'system', content: SYNTHESIZER_SYSTEM },
      { role: 'user', content: `Question: ${question}\n\nFindings:\n${results.map((result) => result.output).join('\n\n')}` },
    ],
  });
  return {
    answer: synthesis.text,
    plan,
    results,
    usage: { calls: 1, inputTokens: synthesis.usage.inputTokens, outputTokens: synthesis.usage.outputTokens, cost: synthesis.usage.cost },
  };
}
