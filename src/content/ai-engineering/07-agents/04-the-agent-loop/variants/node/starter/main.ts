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

export async function executeToolCall(tools: AgentTool[], call: ToolCall): Promise<string> {
  // TODO: never throw: return an "Error: ..." result for an unknown tool, arguments that are not a JSON object, or a tool that throws
  const tool = tools.find((candidate) => candidate.name === call.name);
  return serialize(await tool!.execute(JSON.parse(call.arguments)));
}

export async function runAgent(model: ChatModel, options: AgentOptions): Promise<AgentResult> {
  // TODO: loop up to maxSteps: call the model, append its turn, stop on a refusal or a final answer, otherwise run every tool call and append one tool message per call
  const messages: Message[] = [{ role: 'user', content: options.task }];
  const response = await model.generate({ messages, tools: options.tools.map(toDefinition) });
  return { status: 'done', answer: response.text, steps: 1, messages };
}
