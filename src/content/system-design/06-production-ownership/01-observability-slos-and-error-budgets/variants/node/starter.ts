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
  // TODO: a window without requests (total 0) had no failure: return 1
  return good / total;
}

export function errorBudget({ slo, total, bad }: BudgetInput): ErrorBudget {
  // TODO: allowedBad = (1 - slo) * total, not rounded, and remaining = allowedBad - bad
  // TODO: consumedRatio = bad / allowedBad; when allowedBad is 0: 0 without bad events, Infinity with any
  return { allowedBad: 0, remaining: 0, consumedRatio: 0 };
}

export function burnRate({ slo, good, total }: BurnRateInput): number {
  // TODO: divide the error rate of the window by the error rate the SLO allows (1 - slo); an empty window burns 0
  return total - good;
}

export function shouldPage({ slo, longWindow, shortWindow, threshold }: PageInput): boolean {
  // TODO: page only when the burn rate of both windows is greater than threshold
  return burnRate({ slo, ...shortWindow }) > threshold;
}

const slo = 0.999;
const month = errorBudget({ slo, total: 2_000_000, bad: 600 });
console.log(`budget: ${month.allowedBad.toFixed(0)} bad requests, ${month.remaining.toFixed(0)} left, ${(month.consumedRatio * 100).toFixed(1)}% consumed`);
const lastHour = { good: 9_850, total: 10_000 };
const lastFiveMinutes = { good: 820, total: 833 };
console.log(`burn rate: ${burnRate({ slo, ...lastHour }).toFixed(1)} over 1 hour, ${burnRate({ slo, ...lastFiveMinutes }).toFixed(1)} over 5 minutes`);
console.log('page:', shouldPage({ slo, longWindow: lastHour, shortWindow: lastFiveMinutes, threshold: 14.4 }));
