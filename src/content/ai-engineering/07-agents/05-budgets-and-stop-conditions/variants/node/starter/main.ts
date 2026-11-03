import type { GenerateRequest, GenerateResponse, Message, ToolCall } from '@dojo/ai';

export interface ChatModel {
  generate(request: GenerateRequest): Promise<GenerateResponse>;
}

export interface AgentTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (args: Record<string, unknown>) => unknown;
}

export interface Budget {
  maxSteps: number;
  maxTokens?: number;
  maxCostUsd?: number;
  maxDurationMs?: number;
}

export interface BudgetedAgentOptions {
  task: string;
  tools: AgentTool[];
  budget: Budget;
  now?: () => number;
  repeatLimit?: number;
}

export type StopReason = 'done' | 'refused' | 'max_steps' | 'max_tokens' | 'max_cost' | 'timeout' | 'stuck';

export interface StopCondition {
  reason: StopReason;
  detail: string;
}

export interface UsageTotals {
  steps: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUsd: number;
}

export interface BudgetedResult {
  stop: StopCondition;
  answer: string | null;
  usage: UsageTotals;
  elapsedMs: number;
  messages: Message[];
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
    return `Error: the arguments for "${call.name}" are not a valid JSON object.`;
  }
  try {
    const result = await tool.execute(args);
    return typeof result === 'string' ? result : JSON.stringify(result ?? null);
  } catch (error) {
    return `Error: ${error instanceof Error ? error.message : String(error)}`;
  }
}

export function callSignature(call: Pick<ToolCall, 'name' | 'arguments'>): string {
  // TODO: parse the arguments and serialize them with sorted keys (at every level), so key order does not matter; fall back to the raw text when they do not parse
  return `${call.name}:${call.arguments}`;
}

export async function runBudgetedAgent(model: ChatModel, options: BudgetedAgentOptions): Promise<BudgetedResult> {
  // TODO: before each call check maxSteps and maxDurationMs (with the injected now); after each call add response.usage to the totals,
  // TODO: stop on refusal or a final answer, then on maxTokens or maxCostUsd, and stop as stuck when the same call repeats repeatLimit times in a row
  const { task, tools, budget, now = Date.now } = options;
  const startedAt = now();
  const messages: Message[] = [{ role: 'user', content: task }];
  const definitions = tools.map(({ name, description, parameters }) => ({ name, description, parameters }));
  const usage: UsageTotals = { steps: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0, costUsd: 0 };
  for (let step = 1; step <= budget.maxSteps; step++) {
    const response = await model.generate({ messages, tools: definitions });
    usage.steps = step;
    messages.push({ role: 'assistant', content: response.text, toolCalls: response.toolCalls });
    if (response.toolCalls.length === 0) {
      return { stop: { reason: 'done', detail: 'Final answer.' }, answer: response.text, usage, elapsedMs: now() - startedAt, messages };
    }
    for (const call of response.toolCalls) {
      messages.push({ role: 'tool', toolCallId: call.id, content: await executeToolCall(tools, call) });
    }
  }
  return { stop: { reason: 'max_steps', detail: 'Step limit reached.' }, answer: null, usage, elapsedMs: now() - startedAt, messages };
}
