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
  // TODO: count input tokens with countTokens(messages), add the safety margin (round up) and price the worst case (every allowed output token)
  return { inputTokens: 0, maxOutputTokens: maxTokens, maxCost: 0 };
}

export function createBudgetedClient({ model, pricing, maxRequestCost, maxSessionCost, safetyMargin = 0.2, now = () => Date.now() }: BudgetedClientOptions) {
  const totals: SessionReport = { requests: 0, inputTokens: 0, outputTokens: 0, cost: 0, latenciesMs: [] };

  return {
    async send(messages: Message[], maxTokens: number): Promise<SendResult> {
      // TODO: estimate with the safety margin and refuse with BudgetExceededError('request' | 'session', ...) before calling the model when the worst case does not fit
      // TODO: time the call with now(), then add the provider's usage and the latency to the totals
      const response = await model.generate({ messages, maxTokens });
      return { text: response.text, usage: response.usage, estimatedCost: 0, latencyMs: 0 };
    },
    report(): SessionReport {
      return { ...totals, latenciesMs: [...totals.latenciesMs] };
    },
  };
}
