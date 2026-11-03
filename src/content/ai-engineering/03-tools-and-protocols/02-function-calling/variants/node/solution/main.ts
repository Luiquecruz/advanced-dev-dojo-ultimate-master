import type { GenerateRequest, GenerateResponse, Message, ToolCall, ToolDefinition } from '@dojo/ai';

export interface ChatModel {
  generate(request: GenerateRequest): Promise<GenerateResponse>;
}

export interface Tool extends ToolDefinition {
  execute(args: Record<string, unknown>): unknown | Promise<unknown>;
}

export type ParsedArguments = { ok: true; value: Record<string, unknown> } | { ok: false; error: string };

export interface ToolRunOptions {
  messages: Message[];
  tools: Tool[];
  maxRounds?: number;
}

export interface ToolRunResult {
  text: string;
  messages: Message[];
  rounds: number;
}

export class ToolLoopLimitError extends Error {
  readonly rounds: number;

  constructor(rounds: number) {
    super(`The model still requested tools after ${rounds} rounds`);
    this.name = 'ToolLoopLimitError';
    this.rounds = rounds;
  }
}

export function parseToolArguments(raw: string): ParsedArguments {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return { ok: false, error: 'Arguments are not valid JSON' };
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { ok: false, error: 'Arguments must be a JSON object' };
  }
  return { ok: true, value: value as Record<string, unknown> };
}

function toolMessage(call: ToolCall, content: string): Message {
  return { role: 'tool', toolCallId: call.id, content };
}

function errorMessage(call: ToolCall, error: string): Message {
  return toolMessage(call, JSON.stringify({ error }));
}

export async function executeToolCall(call: ToolCall, tools: Tool[]): Promise<Message> {
  const tool = tools.find((candidate) => candidate.name === call.name);
  if (!tool) {
    const available = tools.map((candidate) => candidate.name).join(', ');
    return errorMessage(call, `Unknown tool "${call.name}". Available tools: ${available}.`);
  }
  const parsed = parseToolArguments(call.arguments);
  if (!parsed.ok) {
    return errorMessage(call, `Invalid arguments for "${call.name}": ${parsed.error}. Call it again with a JSON object.`);
  }
  try {
    const result = await tool.execute(parsed.value);
    return toolMessage(call, typeof result === 'string' ? result : JSON.stringify(result));
  } catch (error) {
    return errorMessage(call, `"${call.name}" failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function definitionOf({ name, description, parameters }: Tool): ToolDefinition {
  return { name, description, parameters };
}

export async function runWithTools(model: ChatModel, { messages, tools, maxRounds = 5 }: ToolRunOptions): Promise<ToolRunResult> {
  const transcript = [...messages];
  const definitions = tools.map(definitionOf);
  for (let round = 1; round <= maxRounds; round++) {
    const response = await model.generate({ messages: [...transcript], tools: definitions });
    if (response.toolCalls.length === 0) {
      transcript.push({ role: 'assistant', content: response.text });
      return { text: response.text, messages: transcript, rounds: round };
    }
    if (round === maxRounds) {
      throw new ToolLoopLimitError(round);
    }
    transcript.push({ role: 'assistant', content: response.text, toolCalls: response.toolCalls });
    for (const call of response.toolCalls) {
      transcript.push(await executeToolCall(call, tools));
    }
  }
  throw new ToolLoopLimitError(maxRounds);
}
