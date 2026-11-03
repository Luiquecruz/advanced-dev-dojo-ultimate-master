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
  // TODO: return { ok: false, error } for text that is not JSON or not a JSON object (arrays and null included)
  return { ok: true, value: JSON.parse(raw) };
}

export async function executeToolCall(call: ToolCall, tools: Tool[]): Promise<Message> {
  // TODO: unknown tool, invalid arguments and a throwing tool become { role: 'tool', toolCallId, content: '{"error": "..."}' }
  const tool = tools.find((candidate) => candidate.name === call.name)!;
  const result = await tool.execute(JSON.parse(call.arguments));
  return { role: 'tool', toolCallId: call.id, content: String(result) };
}

export async function runWithTools(model: ChatModel, { messages, tools, maxRounds = 5 }: ToolRunOptions): Promise<ToolRunResult> {
  // TODO: offer the tool definitions, execute every requested call, append the assistant and tool messages and loop until a text answer, at most maxRounds model calls
  const response = await model.generate({ messages, tools });
  return { text: response.text, messages: [...messages, { role: 'assistant', content: response.text }], rounds: 1 };
}
