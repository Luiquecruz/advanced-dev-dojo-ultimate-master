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

function parseArguments(raw: string): Record<string, unknown> | undefined {
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

async function execute(tool: ApprovalTool, args: Record<string, unknown>): Promise<string> {
  try {
    const result = await tool.execute(args);
    return typeof result === 'string' ? result : JSON.stringify(result ?? null);
  } catch (error) {
    return `Error: ${error instanceof Error ? error.message : String(error)}`;
  }
}

function needsApproval(tool: ApprovalTool, args: Record<string, unknown>): boolean {
  return typeof tool.requiresApproval === 'function' ? tool.requiresApproval(args) : tool.requiresApproval === true;
}

function findTool(tools: ApprovalTool[], name: string): ApprovalTool {
  const tool = tools.find((candidate) => candidate.name === name);
  if (!tool) {
    throw new Error(`Tool "${name}" is not available to resume this run`);
  }
  return tool;
}

async function handleToolCall(tools: ApprovalTool[], call: ToolCall, state: AgentState): Promise<void> {
  const tool = tools.find((candidate) => candidate.name === call.name);
  const args = parseArguments(call.arguments);
  if (!tool) {
    state.messages.push({ role: 'tool', toolCallId: call.id, content: `Error: unknown tool "${call.name}". Available tools: ${tools.map((candidate) => candidate.name).join(', ')}.` });
  } else if (!args) {
    state.messages.push({ role: 'tool', toolCallId: call.id, content: `Error: the arguments for "${call.name}" are not a valid JSON object.` });
  } else if (needsApproval(tool, args)) {
    state.pending.push({ toolCallId: call.id, name: call.name, arguments: args });
  } else {
    state.messages.push({ role: 'tool', toolCallId: call.id, content: await execute(tool, args) });
  }
}

async function continueRun(model: ChatModel, options: RunOptions, state: AgentState): Promise<AgentRun> {
  const definitions = options.tools.map(({ name, description, parameters }) => ({ name, description, parameters }));
  while (state.steps < options.maxSteps) {
    const response = await model.generate({ messages: state.messages, tools: definitions });
    state.steps += 1;
    state.messages.push({ role: 'assistant', content: response.text, toolCalls: response.toolCalls });
    if (response.toolCalls.length === 0) {
      return { status: 'done', answer: response.text, state };
    }
    for (const call of response.toolCalls) {
      await handleToolCall(options.tools, call, state);
    }
    if (state.pending.length > 0) {
      return { status: 'interrupted', pending: state.pending, state };
    }
  }
  return { status: 'max_steps', state };
}

export async function startAgent(model: ChatModel, options: RunOptions & { task: string }): Promise<AgentRun> {
  return continueRun(model, options, { messages: [{ role: 'user', content: options.task }], steps: 0, pending: [] });
}

async function applyDecision(tool: ApprovalTool, pending: PendingApproval, decision: Decision): Promise<string> {
  if (decision.type === 'deny') {
    return `Denied by a human reviewer: ${decision.reason ?? 'no reason given'}`;
  }
  if (decision.type === 'edit') {
    return `A human edited the arguments to ${JSON.stringify(decision.arguments)}. Result: ${await execute(tool, decision.arguments)}`;
  }
  return execute(tool, pending.arguments);
}

export async function resumeAgent(model: ChatModel, options: RunOptions, savedState: AgentState, decisions: Record<string, Decision>): Promise<AgentRun> {
  const state: AgentState = JSON.parse(JSON.stringify(savedState));
  const missing = state.pending.filter((pending) => !decisions[pending.toolCallId]);
  if (missing.length > 0) {
    throw new Error(`Missing a decision for tool calls: ${missing.map((pending) => pending.toolCallId).join(', ')}`);
  }
  for (const pending of state.pending) {
    const content = await applyDecision(findTool(options.tools, pending.name), pending, decisions[pending.toolCallId]);
    state.messages.push({ role: 'tool', toolCallId: pending.toolCallId, content });
  }
  state.pending = [];
  return continueRun(model, options, state);
}
