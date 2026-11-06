export interface WindowCounts {
  good: number;
  total: number;
}

export interface ErrorBudget {
  allowedBad: number;
  remaining: number;
  consumedRatio: number;
}

export interface BudgetInput {
  slo: number;
  total: number;
  bad: number;
}

export interface BurnRateInput extends WindowCounts {
  slo: number;
}

export interface PageInput {
  slo: number;
  longWindow: WindowCounts;
  shortWindow: WindowCounts;
  threshold: number;
}

export function availability({ good, total }: WindowCounts): number {
  if (total === 0) {
    return 1;
  }
  return good / total;
}

export function errorBudget({ slo, total, bad }: BudgetInput): ErrorBudget {
  const allowedBad = (1 - slo) * total;
  const remaining = allowedBad - bad;
  if (allowedBad === 0) {
    return { allowedBad, remaining, consumedRatio: bad === 0 ? 0 : Infinity };
  }
  return { allowedBad, remaining, consumedRatio: bad / allowedBad };
}

export function burnRate({ slo, good, total }: BurnRateInput): number {
  if (total === 0) {
    return 0;
  }
  const errorRate = (total - good) / total;
  return errorRate / (1 - slo);
}

export function shouldPage({ slo, longWindow, shortWindow, threshold }: PageInput): boolean {
  const longBurn = burnRate({ slo, ...longWindow });
  const shortBurn = burnRate({ slo, ...shortWindow });
  return longBurn > threshold && shortBurn > threshold;
}

const slo = 0.999;
const month = errorBudget({ slo, total: 2_000_000, bad: 600 });
console.log(`budget: ${month.allowedBad.toFixed(0)} bad requests, ${month.remaining.toFixed(0)} left, ${(month.consumedRatio * 100).toFixed(1)}% consumed`);
const lastHour = { good: 9_850, total: 10_000 };
const lastFiveMinutes = { good: 820, total: 833 };
console.log(`burn rate: ${burnRate({ slo, ...lastHour }).toFixed(1)} over 1 hour, ${burnRate({ slo, ...lastFiveMinutes }).toFixed(1)} over 5 minutes`);
console.log('page:', shouldPage({ slo, longWindow: lastHour, shortWindow: lastFiveMinutes, threshold: 14.4 }));
