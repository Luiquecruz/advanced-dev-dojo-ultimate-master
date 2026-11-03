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
  const steps: TrajectoryStep[] = [];
  const run = await runAgent(model, {
    ...options,
    onEvent: (event) => {
      if (event.type === 'model') {
        const { inputTokens, outputTokens, cost } = event.response.usage;
        steps.push({ type: 'model', inputTokens, outputTokens, costUsd: cost });
      } else {
        steps.push({ type: 'tool', name: event.call.name, arguments: parseArguments(event.call.arguments), ok: event.ok });
      }
    },
  });
  return { task: options.task, status: run.status, answer: run.answer, steps };
}

function measure(steps: TrajectoryStep[]): TrajectoryMetrics {
  const metrics: TrajectoryMetrics = { modelCalls: 0, toolCalls: 0, inputTokens: 0, outputTokens: 0, costUsd: 0 };
  for (const step of steps) {
    if (step.type === 'model') {
      metrics.modelCalls += 1;
      metrics.inputTokens += step.inputTokens;
      metrics.outputTokens += step.outputTokens;
      metrics.costUsd += step.costUsd;
    } else {
      metrics.toolCalls += 1;
    }
  }
  return metrics;
}

export function evaluateTrajectory(trajectory: Trajectory, spec: TrajectorySpec): TrajectoryEvaluation {
  const violations: Violation[] = [];
  const toolSteps = trajectory.steps.flatMap((step, index) => (step.type === 'tool' ? [{ ...step, index }] : []));
  const metrics = measure(trajectory.steps);

  if ((spec.requireDone ?? true) && trajectory.status !== 'done') {
    violations.push({ rule: 'not_done', detail: `The run ended with status "${trajectory.status}" instead of "done"` });
  }
  for (const tool of spec.requiredTools ?? []) {
    if (!toolSteps.some((step) => step.name === tool && step.ok)) {
      violations.push({ rule: 'missing_tool', detail: `Required tool "${tool}" was never called successfully` });
    }
  }
  for (const step of toolSteps) {
    if ((spec.forbiddenTools ?? []).includes(step.name)) {
      violations.push({ rule: 'forbidden_tool', detail: `Forbidden tool "${step.name}" was called`, step: step.index });
    }
  }
  for (const [before, after] of spec.order ?? []) {
    const firstBefore = toolSteps.find((step) => step.name === before && step.ok)?.index ?? Infinity;
    toolSteps
      .filter((step) => step.name === after && step.index < firstBefore)
      .forEach((step) => violations.push({ rule: 'order', detail: `"${after}" was called before any successful "${before}"`, step: step.index }));
  }
  for (const forbidden of spec.forbiddenCalls ?? []) {
    toolSteps
      .filter((step) => step.name === forbidden.tool && step.arguments !== null && forbidden.matches(step.arguments))
      .forEach((step) => violations.push({ rule: 'forbidden_call', detail: `${forbidden.tool}: ${forbidden.description}`, step: step.index }));
  }
  if (spec.maxModelCalls !== undefined && metrics.modelCalls > spec.maxModelCalls) {
    violations.push({ rule: 'max_model_calls', detail: `${metrics.modelCalls} model calls, limit ${spec.maxModelCalls}` });
  }
  if (spec.maxToolCalls !== undefined && metrics.toolCalls > spec.maxToolCalls) {
    violations.push({ rule: 'max_tool_calls', detail: `${metrics.toolCalls} tool calls, limit ${spec.maxToolCalls}` });
  }
  if (spec.maxCostUsd !== undefined && metrics.costUsd > spec.maxCostUsd) {
    violations.push({ rule: 'max_cost', detail: `Cost $${metrics.costUsd.toFixed(6)}, limit $${spec.maxCostUsd}` });
  }
  return { pass: violations.length === 0, violations, metrics };
}

export function evaluateSuite(cases: SuiteCase[]): SuiteReport {
  const results = cases.map(({ id, trajectory, spec }) => {
    const { pass, violations } = evaluateTrajectory(trajectory, spec);
    return { id, pass, violations };
  });
  const violationsByRule: Partial<Record<ViolationRule, number>> = {};
  results.flatMap((result) => result.violations).forEach((violation) => (violationsByRule[violation.rule] = (violationsByRule[violation.rule] ?? 0) + 1));
  return { results, passRate: results.length === 0 ? 0 : results.filter((result) => result.pass).length / results.length, violationsByRule };
}
