import type { GenerateRequest, GenerateResponse, Message, ToolCall } from '@dojo/ai';

export interface ChatModel {
  generate(request: GenerateRequest): Promise<GenerateResponse>;
}

export interface Tool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute(args: Record<string, unknown>): unknown;
}

export type AgentEvent = { type: 'model'; response: GenerateResponse } | { type: 'tool'; call: ToolCall; result: string; ok: boolean };

export interface AgentOptions {
  task: string;
  tools: Tool[];
  maxSteps: number;
  onEvent?: (event: AgentEvent) => void;
}

export type AgentStatus = 'done' | 'refused' | 'max_steps';

export interface AgentRun {
  status: AgentStatus;
  answer: string | null;
}

export type TrajectoryStep =
  | { type: 'model'; inputTokens: number; outputTokens: number; costUsd: number }
  | { type: 'tool'; name: string; arguments: Record<string, unknown> | null; ok: boolean };

export interface Trajectory {
  task: string;
  status: AgentStatus;
  answer: string | null;
  steps: TrajectoryStep[];
}

export interface ForbiddenCall {
  tool: string;
  description: string;
  matches(args: Record<string, unknown>): boolean;
}

export interface TrajectorySpec {
  requiredTools?: string[];
  forbiddenTools?: string[];
  order?: Array<[string, string]>;
  forbiddenCalls?: ForbiddenCall[];
  maxModelCalls?: number;
  maxToolCalls?: number;
  maxCostUsd?: number;
  requireDone?: boolean;
}

export type ViolationRule = 'not_done' | 'missing_tool' | 'forbidden_tool' | 'order' | 'forbidden_call' | 'max_model_calls' | 'max_tool_calls' | 'max_cost';

export interface Violation {
  rule: ViolationRule;
  detail: string;
  step?: number;
}

export interface TrajectoryMetrics {
  modelCalls: number;
  toolCalls: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

export interface TrajectoryEvaluation {
  pass: boolean;
  violations: Violation[];
  metrics: TrajectoryMetrics;
}

export interface SuiteCase {
  id: string;
  trajectory: Trajectory;
  spec: TrajectorySpec;
}

export interface SuiteReport {
  results: Array<{ id: string; pass: boolean; violations: Violation[] }>;
  passRate: number;
  violationsByRule: Partial<Record<ViolationRule, number>>;
}

export function parseArguments(raw: string): Record<string, unknown> | null {
  try {
    const value = JSON.parse(raw);
    return typeof value === 'object' && value !== null && !Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}

async function executeToolCall(tools: Tool[], call: ToolCall): Promise<{ result: string; ok: boolean }> {
  const tool = tools.find((candidate) => candidate.name === call.name);
  if (!tool) {
    return { result: `Error: unknown tool "${call.name}". Available tools: ${tools.map((candidate) => candidate.name).join(', ')}`, ok: false };
  }
  const args = parseArguments(call.arguments);
  if (!args) {
    return { result: `Error: the arguments for "${call.name}" are not a JSON object`, ok: false };
  }
  try {
    const result = await tool.execute(args);
    return { result: typeof result === 'string' ? result : JSON.stringify(result), ok: true };
  } catch (error) {
    return { result: `Error: ${(error as Error).message}`, ok: false };
  }
}

export async function runAgent(model: ChatModel, { task, tools, maxSteps, onEvent = () => {} }: AgentOptions): Promise<AgentRun> {
  const messages: Message[] = [{ role: 'user', content: task }];
  const definitions = tools.map(({ name, description, parameters }) => ({ name, description, parameters }));
  for (let step = 0; step < maxSteps; step++) {
    const response = await model.generate({ messages, tools: definitions });
    onEvent({ type: 'model', response });
    messages.push({ role: 'assistant', content: response.text, toolCalls: response.toolCalls });
    if (response.finishReason === 'refusal' || response.finishReason === 'content_filter') {
      return { status: 'refused', answer: null };
    }
    if (response.toolCalls.length === 0) {
      return { status: 'done', answer: response.text };
    }
    for (const call of response.toolCalls) {
      const { result, ok } = await executeToolCall(tools, call);
      onEvent({ type: 'tool', call, result, ok });
      messages.push({ role: 'tool', toolCallId: call.id, content: result });
    }
  }
  return { status: 'max_steps', answer: null };
}

export async function recordTrajectory(model: ChatModel, options: Omit<AgentOptions, 'onEvent'>): Promise<Trajectory> {
  // TODO: run the agent with an onEvent callback that records one step per model response and per tool call
  const run = await runAgent(model, options);
  return { task: options.task, status: run.status, answer: run.answer, steps: [] };
}

export function evaluateTrajectory(trajectory: Trajectory, spec: TrajectorySpec): TrajectoryEvaluation {
  // TODO: compute the metrics and report every violation: not_done, missing_tool, forbidden_tool, order, forbidden_call and the limits
  const violations: Violation[] = [];
  if (trajectory.status !== 'done') {
    violations.push({ rule: 'not_done', detail: `status ${trajectory.status}` });
  }
  return { pass: violations.length === 0, violations, metrics: { modelCalls: 0, toolCalls: 0, inputTokens: 0, outputTokens: 0, costUsd: 0 } };
}

export function evaluateSuite(cases: SuiteCase[]): SuiteReport {
  // TODO: evaluate every case, then compute the pass rate and count violations per rule
  throw new Error('Not implemented');
}
