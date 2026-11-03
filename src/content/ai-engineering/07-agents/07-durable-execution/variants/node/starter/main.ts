import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { GenerateRequest, GenerateResponse, Message } from '@dojo/ai';

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

export function createFileStore(directory = '/app/checkpoints'): CheckpointStore {
  // TODO: reject unsafe run ids, return undefined when the file does not exist, and write atomically (temporary file + rename)
  return {
    async load(runId) {
      return JSON.parse(await readFile(join(directory, `${runId}.json`), 'utf8'));
    },
    async save(checkpoint) {
      await mkdir(directory, { recursive: true });
      await writeFile(join(directory, `${checkpoint.runId}.json`), JSON.stringify(checkpoint));
    },
  };
}

export function idempotencyKey(runId: string, toolCallId: string): string {
  // TODO: a key that is the same every time this run executes this tool call
  return `${runId}:${Date.now()}`;
}

export async function runDurableAgent(model: ChatModel, options: DurableOptions): Promise<DurableResult> {
  // TODO: load the checkpoint (resume) or save a new one; finish unanswered tool calls first; save after every model response and every tool result
  const { runId, task, tools, maxSteps } = options;
  const messages: Message[] = [{ role: 'user', content: task }];
  const definitions = tools.map(({ name, description, parameters }) => ({ name, description, parameters }));
  for (let step = 1; step <= maxSteps; step++) {
    const response = await model.generate({ messages, tools: definitions });
    messages.push({ role: 'assistant', content: response.text, toolCalls: response.toolCalls });
    if (response.toolCalls.length === 0) {
      return { status: 'done', answer: response.text, steps: step, resumed: false };
    }
    for (const call of response.toolCalls) {
      const tool = tools.find((candidate) => candidate.name === call.name);
      const result = tool ? await tool.execute(JSON.parse(call.arguments), { idempotencyKey: idempotencyKey(runId, call.id) }) : `Error: unknown tool "${call.name}".`;
      messages.push({ role: 'tool', toolCallId: call.id, content: typeof result === 'string' ? result : JSON.stringify(result) });
    }
  }
  return { status: 'max_steps', answer: null, steps: maxSteps, resumed: false };
}
