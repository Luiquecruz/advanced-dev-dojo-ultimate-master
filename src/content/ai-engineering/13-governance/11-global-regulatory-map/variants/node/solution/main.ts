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
const CONDITION_KEYS = ['uses', 'dataTypes', 'users'] as const;

export function coversMarket(jurisdiction: string, markets: string[]): boolean {
  return markets.some((market) => market === jurisdiction || market.startsWith(`${jurisdiction}-`));
}

export function matchesFeature(when: RuleCondition, feature: Feature): boolean {
  return CONDITION_KEYS.every((key) => {
    const required = when[key];
    return required === undefined || required.some((value) => feature[key].includes(value));
  });
}

function statusOf(rule: Rule, asOf: string): ObligationStatus {
  if (rule.status === 'bill') {
    return 'proposed';
  }
  return rule.appliesFrom !== undefined && Date.parse(rule.appliesFrom) > Date.parse(asOf) ? 'upcoming' : 'applies';
}

export function mapObligations(profile: ProductProfile, rules: Rule[], asOf: string): Obligation[] {
  const obligations: Obligation[] = [];
  for (const rule of rules.filter((candidate) => coversMarket(candidate.jurisdiction, profile.markets))) {
    for (const feature of profile.features.filter((candidate) => matchesFeature(rule.when, candidate))) {
      const obligation: Obligation = { ruleId: rule.id, jurisdiction: rule.jurisdiction, instrument: rule.instrument, featureId: feature.id, obligation: rule.obligation, status: statusOf(rule, asOf) };
      if (rule.appliesFrom !== undefined) {
        obligation.appliesFrom = rule.appliesFrom;
      }
      obligations.push(obligation);
    }
  }
  return obligations.sort((left, right) => left.jurisdiction.localeCompare(right.jurisdiction) || left.ruleId.localeCompare(right.ruleId) || left.featureId.localeCompare(right.featureId));
}

export function summarize(obligations: Obligation[]): JurisdictionSummary {
  const summary: JurisdictionSummary = {};
  for (const obligation of obligations) {
    summary[obligation.jurisdiction] ??= { applies: 0, upcoming: 0, proposed: 0 };
    summary[obligation.jurisdiction][obligation.status] += 1;
  }
  return summary;
}

export function checkFreshness(rulesAsOf: string, asOf: string, maxAgeDays = 92): { fresh: boolean; ageDays: number } {
  const ageDays = Math.floor((Date.parse(asOf) - Date.parse(rulesAsOf)) / DAY_MS);
  return { fresh: ageDays <= maxAgeDays, ageDays };
}
