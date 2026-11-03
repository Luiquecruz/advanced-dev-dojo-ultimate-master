import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { GenerateRequest, GenerateResponse, Message, ToolCall } from '@dojo/ai';

export interface ChatModel {
  generate(request: GenerateRequest): Promise<GenerateResponse>;
}

export interface DurableTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (args: Record<string, unknown>, context: { idempotencyKey: string }) => unknown;
}

export interface Checkpoint {
  runId: string;
  status: 'running' | 'done';
  messages: Message[];
  steps: number;
  answer: string | null;
}

export interface CheckpointStore {
  load(runId: string): Promise<Checkpoint | undefined>;
  save(checkpoint: Checkpoint): Promise<void>;
}

export interface DurableOptions {
  runId: string;
  task: string;
  tools: DurableTool[];
  store: CheckpointStore;
  maxSteps: number;
}

export interface DurableResult {
  status: 'done' | 'max_steps';
  answer: string | null;
  steps: number;
  resumed: boolean;
}

const RUN_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

function checkpointPath(directory: string, runId: string): string {
  if (!RUN_ID_PATTERN.test(runId)) {
    throw new Error(`Invalid run id "${runId}": use letters, digits, "-" and "_" only`);
  }
  return join(directory, `${runId}.json`);
}

export function createFileStore(directory = '/app/checkpoints'): CheckpointStore {
  return {
    async load(runId) {
      try {
        return JSON.parse(await readFile(checkpointPath(directory, runId), 'utf8'));
      } catch (error) {
        if ((error as { code?: string }).code === 'ENOENT') {
          return undefined;
        }
        throw error;
      }
    },
    async save(checkpoint) {
      const path = checkpointPath(directory, checkpoint.runId);
      await mkdir(directory, { recursive: true });
      await writeFile(`${path}.tmp`, JSON.stringify(checkpoint));
      await rename(`${path}.tmp`, path);
    },
  };
}

export function idempotencyKey(runId: string, toolCallId: string): string {
  return `${runId}:${toolCallId}`;
}

function parseArguments(raw: string): Record<string, unknown> | undefined {
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

async function executeToolCall(tools: DurableTool[], call: ToolCall, runId: string): Promise<string> {
  const tool = tools.find((candidate) => candidate.name === call.name);
  if (!tool) {
    return `Error: unknown tool "${call.name}".`;
  }
  const args = parseArguments(call.arguments);
  if (!args) {
    return `Error: the arguments for "${call.name}" are not a valid JSON object.`;
  }
  try {
    const result = await tool.execute(args, { idempotencyKey: idempotencyKey(runId, call.id) });
    return typeof result === 'string' ? result : JSON.stringify(result ?? null);
  } catch (error) {
    return `Error: ${error instanceof Error ? error.message : String(error)}`;
  }
}

function unansweredCalls(messages: Message[]): ToolCall[] {
  const lastAssistantIndex = messages.map((message) => message.role).lastIndexOf('assistant');
  if (lastAssistantIndex === -1) {
    return [];
  }
  const answered = new Set(messages.slice(lastAssistantIndex + 1).map((message) => message.toolCallId));
  return (messages[lastAssistantIndex].toolCalls ?? []).filter((call) => !answered.has(call.id));
}

export async function runDurableAgent(model: ChatModel, options: DurableOptions): Promise<DurableResult> {
  const { runId, task, tools, store, maxSteps } = options;
  const saved = await store.load(runId);
  const resumed = saved !== undefined;
  const checkpoint: Checkpoint = saved ?? { runId, status: 'running', messages: [{ role: 'user', content: task }], steps: 0, answer: null };
  if (!resumed) {
    await store.save(checkpoint);
  }
  if (checkpoint.status === 'done') {
    return { status: 'done', answer: checkpoint.answer, steps: checkpoint.steps, resumed };
  }
  const definitions = tools.map(({ name, description, parameters }) => ({ name, description, parameters }));
  while (true) {
    for (const call of unansweredCalls(checkpoint.messages)) {
      checkpoint.messages.push({ role: 'tool', toolCallId: call.id, content: await executeToolCall(tools, call, runId) });
      await store.save(checkpoint);
    }
    if (checkpoint.steps >= maxSteps) {
      return { status: 'max_steps', answer: null, steps: checkpoint.steps, resumed };
    }
    const response = await model.generate({ messages: checkpoint.messages, tools: definitions });
    checkpoint.steps += 1;
    checkpoint.messages.push({ role: 'assistant', content: response.text, toolCalls: response.toolCalls });
    if (response.toolCalls.length === 0) {
      checkpoint.status = 'done';
      checkpoint.answer = response.text;
    }
    await store.save(checkpoint);
    if (checkpoint.status === 'done') {
      return { status: 'done', answer: checkpoint.answer, steps: checkpoint.steps, resumed };
    }
  }
}
