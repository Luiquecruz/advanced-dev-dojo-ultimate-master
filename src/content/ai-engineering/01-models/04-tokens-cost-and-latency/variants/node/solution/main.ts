import { countTokens } from '@dojo/ai';
import type { GenerateRequest, GenerateResponse, Message, Usage } from '@dojo/ai';

export interface Pricing {
  inputPerMillion: number;
  outputPerMillion: number;
}

export interface ChatModel {
  generate(request: GenerateRequest): Promise<GenerateResponse>;
}

export interface CostEstimate {
  inputTokens: number;
  maxOutputTokens: number;
  maxCost: number;
}

export type BudgetScope = 'request' | 'session';

export class BudgetExceededError extends Error {
  constructor(
    readonly scope: BudgetScope,
    message: string,
  ) {
    super(message);
    this.name = 'BudgetExceededError';
  }
}

export interface BudgetedClientOptions {
  model: ChatModel;
  pricing: Pricing;
  maxRequestCost: number;
  maxSessionCost: number;
  safetyMargin?: number;
  now?: () => number;
}

export interface SendResult {
  text: string;
  usage: Usage;
  estimatedCost: number;
  latencyMs: number;
}

export interface SessionReport {
  requests: number;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  latenciesMs: number[];
}

export function estimateCost(messages: Message[], maxTokens: number, pricing: Pricing, safetyMargin = 0): CostEstimate {
  const inputTokens = Math.ceil(countTokens(messages) * (1 + safetyMargin));
  const maxCost = (inputTokens * pricing.inputPerMillion + maxTokens * pricing.outputPerMillion) / 1_000_000;
  return { inputTokens, maxOutputTokens: maxTokens, maxCost };
}

export function createBudgetedClient({ model, pricing, maxRequestCost, maxSessionCost, safetyMargin = 0.2, now = () => Date.now() }: BudgetedClientOptions) {
  const totals: SessionReport = { requests: 0, inputTokens: 0, outputTokens: 0, cost: 0, latenciesMs: [] };

  return {
    async send(messages: Message[], maxTokens: number): Promise<SendResult> {
      const estimate = estimateCost(messages, maxTokens, pricing, safetyMargin);
      if (estimate.maxCost > maxRequestCost) {
        throw new BudgetExceededError('request', `Request could cost $${estimate.maxCost}, above the $${maxRequestCost} request limit`);
      }
      if (totals.cost + estimate.maxCost > maxSessionCost) {
        throw new BudgetExceededError('session', `Request could cost $${estimate.maxCost} with $${maxSessionCost - totals.cost} left in the session`);
      }
      const startedAt = now();
      const response = await model.generate({ messages, maxTokens });
      const latencyMs = now() - startedAt;
      totals.requests += 1;
      totals.inputTokens += response.usage.inputTokens;
      totals.outputTokens += response.usage.outputTokens;
      totals.cost += response.usage.cost;
      totals.latenciesMs.push(latencyMs);
      return { text: response.text, usage: response.usage, estimatedCost: estimate.maxCost, latencyMs };
    },
    report(): SessionReport {
      return { ...totals, latenciesMs: [...totals.latenciesMs] };
    },
  };
}
