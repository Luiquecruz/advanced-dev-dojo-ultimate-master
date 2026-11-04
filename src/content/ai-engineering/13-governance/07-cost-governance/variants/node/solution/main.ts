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

const matches = (budget: Budget, context: CallContext) => (budget.team === undefined || budget.team === context.team) && (budget.feature === undefined || budget.feature === context.feature);

function add(totals: Record<string, number>, key: string, amount: number) {
  totals[key] = (totals[key] ?? 0) + amount;
}

export function createCostGovernor({ budgets, alertThresholds = [0.5, 0.8, 1], rateLimits = {}, now, onAlert = () => {} }: GovernorOptions): CostGovernor {
  const spentByBudget = new Map(budgets.map((budget) => [budget.id, 0]));
  const firedAlerts = new Set<string>();
  const callsByTeam = new Map<string, number[]>();
  const report: CostReport = { totalUsd: 0, byTeam: {}, byFeature: {}, byModel: {} };
  const thresholds = [...alertThresholds].sort((left, right) => left - right);

  return {
    check(context, estimatedCostUsd) {
      for (const budget of budgets.filter((candidate) => matches(candidate, context))) {
        if (spentByBudget.get(budget.id)! + estimatedCostUsd > budget.limitUsd) {
          return { allowed: false, reason: 'hard-limit', budgetId: budget.id };
        }
      }
      const limit = rateLimits[context.team];
      const current = now();
      const recent = (callsByTeam.get(context.team) ?? []).filter((timestamp) => timestamp > current - (limit?.windowMs ?? 0));
      if (limit && recent.length >= limit.requests) {
        callsByTeam.set(context.team, recent);
        return { allowed: false, reason: 'rate-limit', retryAfterMs: recent[0] + limit.windowMs - current };
      }
      callsByTeam.set(context.team, [...recent, current]);
      return { allowed: true };
    },
    record(context, model, usage) {
      for (const budget of budgets.filter((candidate) => matches(candidate, context))) {
        const before = spentByBudget.get(budget.id)!;
        const after = before + usage.cost;
        spentByBudget.set(budget.id, after);
        for (const threshold of thresholds) {
          const key = `${budget.id}:${threshold}`;
          if (!firedAlerts.has(key) && after >= threshold * budget.limitUsd) {
            firedAlerts.add(key);
            onAlert({ budgetId: budget.id, threshold, spentUsd: after, limitUsd: budget.limitUsd });
          }
        }
      }
      report.totalUsd += usage.cost;
      add(report.byTeam, context.team, usage.cost);
      add(report.byFeature, `${context.team}/${context.feature}`, usage.cost);
      add(report.byModel, model, usage.cost);
    },
    spent(budgetId) {
      return spentByBudget.get(budgetId) ?? 0;
    },
    report() {
      return { totalUsd: report.totalUsd, byTeam: { ...report.byTeam }, byFeature: { ...report.byFeature }, byModel: { ...report.byModel } };
    },
  };
}

export function estimateCostUsd(request: GenerateRequest, pricing: Pricing, defaultMaxTokens = 1000): number {
  const inputTokens = countTokens(request.messages);
  const outputTokens = request.maxTokens ?? defaultMaxTokens;
  return (inputTokens * pricing.inputPerMillion + outputTokens * pricing.outputPerMillion) / 1_000_000;
}

export async function governedGenerate(governor: CostGovernor, model: Model, context: CallContext, request: GenerateRequest, pricing: Pricing): Promise<GenerateResponse> {
  const result = governor.check(context, estimateCostUsd(request, pricing));
  if (!result.allowed) {
    throw new BudgetExceededError(result);
  }
  const response = await model.generate(request);
  governor.record(context, response.model, response.usage);
  return response;
}
