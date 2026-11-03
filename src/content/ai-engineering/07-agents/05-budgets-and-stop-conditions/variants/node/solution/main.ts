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

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonical);
  }
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonical((value as Record<string, unknown>)[key])]),
    );
  }
  return value;
}

export function callSignature(call: Pick<ToolCall, 'name' | 'arguments'>): string {
  try {
    return `${call.name}:${JSON.stringify(canonical(JSON.parse(call.arguments)))}`;
  } catch {
    return `${call.name}:${call.arguments}`;
  }
}

export async function runBudgetedAgent(model: ChatModel, options: BudgetedAgentOptions): Promise<BudgetedResult> {
  const { task, tools, budget, now = Date.now, repeatLimit = 3 } = options;
  const startedAt = now();
  const messages: Message[] = [{ role: 'user', content: task }];
  const definitions = tools.map(({ name, description, parameters }) => ({ name, description, parameters }));
  const usage: UsageTotals = { steps: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0, costUsd: 0 };
  let lastSignature = '';
  let repeats = 0;

  const finish = (reason: StopReason, detail: string, answer: string | null = null): BudgetedResult => ({
    stop: { reason, detail },
    answer,
    usage,
    elapsedMs: now() - startedAt,
    messages,
  });

  while (true) {
    if (usage.steps >= budget.maxSteps) {
      return finish('max_steps', `Reached the limit of ${budget.maxSteps} steps without a final answer.`);
    }
    if (budget.maxDurationMs !== undefined && now() - startedAt >= budget.maxDurationMs) {
      return finish('timeout', `Ran for ${now() - startedAt} ms, at or above the ${budget.maxDurationMs} ms limit.`);
    }
    const response = await model.generate({ messages, tools: definitions });
    usage.steps += 1;
    usage.inputTokens += response.usage.inputTokens;
    usage.outputTokens += response.usage.outputTokens;
    usage.totalTokens += response.usage.totalTokens;
    usage.costUsd += response.usage.cost;
    messages.push({ role: 'assistant', content: response.text, toolCalls: response.toolCalls });

    if (response.finishReason === 'refusal' || response.finishReason === 'content_filter') {
      return finish('refused', `The model stopped with finish reason "${response.finishReason}".`);
    }
    if (response.toolCalls.length === 0) {
      return finish('done', `Final answer after ${usage.steps} steps.`, response.text);
    }
    if (budget.maxTokens !== undefined && usage.totalTokens >= budget.maxTokens) {
      return finish('max_tokens', `Used ${usage.totalTokens} tokens of a ${budget.maxTokens}-token budget.`);
    }
    if (budget.maxCostUsd !== undefined && usage.costUsd >= budget.maxCostUsd) {
      return finish('max_cost', `Spent $${usage.costUsd.toFixed(6)} of a $${budget.maxCostUsd} budget.`);
    }
    for (const call of response.toolCalls) {
      const signature = callSignature(call);
      repeats = signature === lastSignature ? repeats + 1 : 1;
      lastSignature = signature;
      if (repeats >= repeatLimit) {
        return finish('stuck', `The model requested ${call.name} with the same arguments ${repeats} times in a row.`);
      }
      messages.push({ role: 'tool', toolCallId: call.id, content: await executeToolCall(tools, call) });
    }
  }
}
