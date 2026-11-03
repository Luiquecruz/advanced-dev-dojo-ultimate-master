import type { GenerateRequest, GenerateResponse, Message, ToolCall, ToolDefinition } from '@dojo/ai';

export interface ChatModel {
  generate(request: GenerateRequest): Promise<GenerateResponse>;
}

export interface AgentTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (args: Record<string, unknown>) => unknown;
}

export interface AgentOptions {
  task: string;
  tools: AgentTool[];
  maxSteps: number;
  system?: string;
}

export type AgentStatus = 'done' | 'refused' | 'max_steps';

export interface AgentResult {
  status: AgentStatus;
  answer: string | null;
  steps: number;
  messages: Message[];
}

function toDefinition(tool: AgentTool): ToolDefinition {
  return { name: tool.name, description: tool.description, parameters: tool.parameters };
}

function serialize(result: unknown): string {
  return typeof result === 'string' ? result : JSON.stringify(result ?? null);
}

function parseArguments(raw: string): Record<string, unknown> | undefined {
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export async function executeToolCall(tools: AgentTool[], call: ToolCall): Promise<string> {
  const tool = tools.find((candidate) => candidate.name === call.name);
  if (!tool) {
    return `Error: unknown tool "${call.name}". Available tools: ${tools.map((candidate) => candidate.name).join(', ')}.`;
  }
  const args = parseArguments(call.arguments);
  if (!args) {
    return `Error: the arguments for "${call.name}" are not a valid JSON object. Call the tool again with valid JSON.`;
  }
  try {
    return serialize(await tool.execute(args));
  } catch (error) {
    return `Error: ${error instanceof Error ? error.message : String(error)}`;
  }
}

export async function runAgent(model: ChatModel, options: AgentOptions): Promise<AgentResult> {
  const messages: Message[] = [...(options.system ? [{ role: 'system' as const, content: options.system }] : []), { role: 'user', content: options.task }];
  const definitions = options.tools.map(toDefinition);
  for (let step = 1; step <= options.maxSteps; step++) {
    const response = await model.generate({ messages, tools: definitions });
    messages.push({ role: 'assistant', content: response.text, toolCalls: response.toolCalls });
    if (response.finishReason === 'refusal' || response.finishReason === 'content_filter') {
      return { status: 'refused', answer: null, steps: step, messages };
    }
    if (response.toolCalls.length === 0) {
      return { status: 'done', answer: response.text, steps: step, messages };
    }
    for (const call of response.toolCalls) {
      messages.push({ role: 'tool', toolCallId: call.id, content: await executeToolCall(options.tools, call) });
    }
  }
  return { status: 'max_steps', answer: null, steps: options.maxSteps, messages };
}
