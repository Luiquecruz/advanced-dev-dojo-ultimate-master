import { countTokens, type GenerateRequest, type GenerateResponse, type Model, type Usage } from '@dojo/ai';

export interface Budget {
  id: string;
  team?: string;
  feature?: string;
  limitUsd: number;
}

export interface RateLimit {
  requests: number;
  windowMs: number;
}

export interface CallContext {
  team: string;
  feature: string;
}

export interface Alert {
  budgetId: string;
  threshold: number;
  spentUsd: number;
  limitUsd: number;
}

export interface Pricing {
  inputPerMillion: number;
  outputPerMillion: number;
}

export type CheckResult = { allowed: true } | { allowed: false; reason: 'hard-limit'; budgetId: string } | { allowed: false; reason: 'rate-limit'; retryAfterMs: number };

export interface CostReport {
  totalUsd: number;
  byTeam: Record<string, number>;
  byFeature: Record<string, number>;
  byModel: Record<string, number>;
}

export interface CostGovernor {
  check(context: CallContext, estimatedCostUsd: number): CheckResult;
  record(context: CallContext, model: string, usage: Usage): void;
  spent(budgetId: string): number;
  report(): CostReport;
}

export interface GovernorOptions {
  budgets: Budget[];
  alertThresholds?: number[];
  rateLimits?: Record<string, RateLimit>;
  now: () => number;
  onAlert?: (alert: Alert) => void;
}

export class BudgetExceededError extends Error {
  constructor(readonly result: Exclude<CheckResult, { allowed: true }>) {
    super(result.reason === 'hard-limit' ? `Budget ${result.budgetId} would be exceeded` : `Rate limit reached; retry in ${result.retryAfterMs} ms`);
    this.name = 'BudgetExceededError';
  }
}

// TODO: hard limits per matching budget before the call, sliding-window rate limits per team, spend and alerts per budget after the call, attribution by team, feature and model
export function createCostGovernor({ budgets, alertThresholds = [0.5, 0.8, 1], rateLimits = {}, now, onAlert = () => {} }: GovernorOptions): CostGovernor {
  let total = 0;
  return {
    check(context, estimatedCostUsd) {
      return { allowed: true };
    },
    record(context, model, usage) {
      total += usage.cost;
    },
    spent(budgetId) {
      return total;
    },
    report() {
      return { totalUsd: total, byTeam: {}, byFeature: {}, byModel: {} };
    },
  };
}

// TODO: countTokens(messages) at the input price plus maxTokens (or defaultMaxTokens) at the output price
export function estimateCostUsd(request: GenerateRequest, pricing: Pricing, defaultMaxTokens = 1000): number {
  throw new Error('Not implemented');
}

// TODO: check the estimate first and throw BudgetExceededError without calling the model; record the actual usage after a successful call
export async function governedGenerate(governor: CostGovernor, model: Model, context: CallContext, request: GenerateRequest, pricing: Pricing): Promise<GenerateResponse> {
  const response = await model.generate(request);
  governor.record(context, response.model, response.usage);
  return response;
}
