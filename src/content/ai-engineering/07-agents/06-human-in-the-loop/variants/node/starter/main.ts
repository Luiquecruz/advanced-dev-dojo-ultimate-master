import type { GenerateRequest, GenerateResponse, Message, ToolCall } from '@dojo/ai';

export interface ChatModel {
  generate(request: GenerateRequest): Promise<GenerateResponse>;
}

export interface ApprovalTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (args: Record<string, unknown>) => unknown;
  requiresApproval?: boolean | ((args: Record<string, unknown>) => boolean);
}

export interface RunOptions {
  tools: ApprovalTool[];
  maxSteps: number;
}

export interface PendingApproval {
  toolCallId: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface AgentState {
  messages: Message[];
  steps: number;
  pending: PendingApproval[];
}

export type Decision = { type: 'approve' } | { type: 'deny'; reason?: string } | { type: 'edit'; arguments: Record<string, unknown> };

export type AgentRun =
  | { status: 'done'; answer: string; state: AgentState }
  | { status: 'interrupted'; pending: PendingApproval[]; state: AgentState }
  | { status: 'max_steps'; state: AgentState };

async function execute(tool: ApprovalTool, args: Record<string, unknown>): Promise<string> {
  try {
    const result = await tool.execute(args);
    return typeof result === 'string' ? result : JSON.stringify(result ?? null);
  } catch (error) {
    return `Error: ${error instanceof Error ? error.message : String(error)}`;
  }
}

export async function startAgent(model: ChatModel, options: RunOptions & { task: string }): Promise<AgentRun> {
  // TODO: before running a tool whose requiresApproval is true (or returns true for the arguments), record it as pending instead;
  // TODO: after the batch, return { status: 'interrupted', pending, state } when anything is pending
  const state: AgentState = { messages: [{ role: 'user', content: options.task }], steps: 0, pending: [] };
  const definitions = options.tools.map(({ name, description, parameters }) => ({ name, description, parameters }));
  while (state.steps < options.maxSteps) {
    const response = await model.generate({ messages: state.messages, tools: definitions });
    state.steps += 1;
    state.messages.push({ role: 'assistant', content: response.text, toolCalls: response.toolCalls });
    if (response.toolCalls.length === 0) {
      return { status: 'done', answer: response.text, state };
    }
    for (const call of response.toolCalls) {
      const tool = options.tools.find((candidate) => candidate.name === call.name);
      const content = tool ? await execute(tool, JSON.parse(call.arguments)) : `Error: unknown tool "${call.name}"`;
      state.messages.push({ role: 'tool', toolCallId: call.id, content });
    }
  }
  return { status: 'max_steps', state };
}

export async function resumeAgent(model: ChatModel, options: RunOptions, savedState: AgentState, decisions: Record<string, Decision>): Promise<AgentRun> {
  // TODO: require a decision for every pending call, apply approve / deny / edit as tool results, then continue the loop from the saved state
  throw new Error('Not implemented');
}
