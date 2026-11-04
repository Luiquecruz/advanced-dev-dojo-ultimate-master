import type { Rule, RuleCondition } from './rules';

export interface Feature {
  id: string;
  uses: string[];
  dataTypes: string[];
  users: string[];
}

export interface ProductProfile {
  name: string;
  markets: string[];
  features: Feature[];
}

export type ObligationStatus = 'applies' | 'upcoming' | 'proposed';

export interface Obligation {
  ruleId: string;
  jurisdiction: string;
  instrument: string;
  featureId: string;
  obligation: string;
  status: ObligationStatus;
  appliesFrom?: string;
}

export type JurisdictionSummary = Record<string, Record<ObligationStatus, number>>;

const DAY_MS = 24 * 60 * 60 * 1000;

// TODO: a jurisdiction covers a market with the same code or a sub-market such as US-CA for US
export function coversMarket(jurisdiction: string, markets: string[]): boolean {
  return markets.includes(jurisdiction);
}

// TODO: every key the condition sets must share at least one value with the feature; an empty condition matches every feature
export function matchesFeature(when: RuleCondition, feature: Feature): boolean {
  return (when.uses ?? []).some((use) => feature.uses.includes(use));
}

// TODO: one obligation per matching rule and feature, with status applies, upcoming or proposed, sorted by jurisdiction, rule and feature
export function mapObligations(profile: ProductProfile, rules: Rule[], asOf: string): Obligation[] {
  const obligations: Obligation[] = [];
  for (const rule of rules.filter((candidate) => coversMarket(candidate.jurisdiction, profile.markets))) {
    for (const feature of profile.features.filter((candidate) => matchesFeature(rule.when, candidate))) {
      obligations.push({ ruleId: rule.id, jurisdiction: rule.jurisdiction, instrument: rule.instrument, featureId: feature.id, obligation: rule.obligation, status: 'applies' });
    }
  }
  return obligations;
}

// TODO: count obligations per jurisdiction and status
export function summarize(obligations: Obligation[]): JurisdictionSummary {
  throw new Error('Not implemented');
}

// TODO: age of the rules table in whole days, fresh while at most maxAgeDays
export function checkFreshness(rulesAsOf: string, asOf: string, maxAgeDays = 92): { fresh: boolean; ageDays: number } {
  return { fresh: true, ageDays: 0 };
}
