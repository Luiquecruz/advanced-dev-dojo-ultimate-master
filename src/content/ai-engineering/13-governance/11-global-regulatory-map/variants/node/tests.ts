const { RULES, RULES_AS_OF } = modules['rules.ts'];

const RULE_TABLE = [
  { id: 'alpha-disclose', jurisdiction: 'AA', instrument: 'Alpha AI Law, Art. 3', status: 'law', appliesFrom: '2026-01-01', when: { uses: ['chatbot'] }, obligation: 'Disclose AI.' },
  { id: 'alpha-high-risk', jurisdiction: 'AA', instrument: 'Alpha AI Law, Art. 9', status: 'law', appliesFrom: '2027-06-01', when: { uses: ['credit-decision', 'employment-decision'], dataTypes: ['personal'] }, obligation: 'Impact assessment.' },
  { id: 'alpha-bill', jurisdiction: 'AA', instrument: 'Alpha Bill 12', status: 'bill', when: { uses: ['chatbot'] }, obligation: 'Proposed: label outputs.' },
  { id: 'beta-federal', jurisdiction: 'BB', instrument: 'Beta Consumer Act', status: 'law', when: { users: ['consumers'] }, obligation: 'No deception.' },
  { id: 'beta-state', jurisdiction: 'BB-NORTH', instrument: 'North Hiring Act', status: 'law', appliesFrom: '2026-03-01', when: { uses: ['employment-decision'] }, obligation: 'Bias audit.' },
  { id: 'gamma-everything', jurisdiction: 'GG', instrument: 'Gamma Promotion Act', status: 'law', appliesFrom: '2025-01-01', when: {}, obligation: 'Cooperate.' },
];

const PRODUCT = {
  name: 'Lumen',
  markets: ['AA', 'BB-NORTH'],
  features: [
    { id: 'support-chat', uses: ['chatbot'], dataTypes: ['personal'], users: ['consumers'] },
    { id: 'credit-limit', uses: ['credit-decision'], dataTypes: ['personal'], users: ['consumers'] },
    { id: 'cv-screening', uses: ['employment-decision'], dataTypes: ['personal'], users: ['job-applicants'] },
  ],
};

const keyOf = (obligation: { ruleId: string; featureId: string; status: string }) => `${obligation.ruleId}/${obligation.featureId}:${obligation.status}`;

test('coversMarket matches the same jurisdiction and its sub-markets, never the reverse', () => {
  expect(mod.coversMarket('BB', ['BB-NORTH'])).toBe(true);
  expect(mod.coversMarket('BB', ['BB'])).toBe(true);
  expect(mod.coversMarket('BB-NORTH', ['BB'])).toBe(false);
  expect(mod.coversMarket('BB-NORTH', ['BB-SOUTH', 'AA'])).toBe(false);
  expect(mod.coversMarket('AA', ['AAX'])).toBe(false);
  expect(mod.coversMarket('AA', [])).toBe(false);
});

test('matchesFeature needs a shared value for every key the condition sets, and an empty condition matches everything', () => {
  const feature = PRODUCT.features[1];
  expect(mod.matchesFeature({ uses: ['chatbot', 'credit-decision'] }, feature)).toBe(true);
  expect(mod.matchesFeature({ uses: ['credit-decision'], dataTypes: ['sensitive'] }, feature)).toBe(false);
  expect(mod.matchesFeature({ uses: ['credit-decision'], dataTypes: ['personal'], users: ['consumers'] }, feature)).toBe(true);
  expect(mod.matchesFeature({ users: ['minors'] }, feature)).toBe(false);
  expect(mod.matchesFeature({}, feature)).toBe(true);
});

test('mapObligations returns one obligation per matching rule and feature, with its source rule, only in the product markets', () => {
  const obligations = mod.mapObligations(PRODUCT, RULE_TABLE, '2026-11-01');
  expect(obligations.map(keyOf)).toEqual([
    'alpha-bill/support-chat:proposed',
    'alpha-disclose/support-chat:applies',
    'alpha-high-risk/credit-limit:upcoming',
    'alpha-high-risk/cv-screening:upcoming',
    'beta-federal/credit-limit:applies',
    'beta-federal/support-chat:applies',
    'beta-state/cv-screening:applies',
  ]);
  expect(obligations[2]).toEqual({ ruleId: 'alpha-high-risk', jurisdiction: 'AA', instrument: 'Alpha AI Law, Art. 9', featureId: 'credit-limit', obligation: 'Impact assessment.', status: 'upcoming', appliesFrom: '2027-06-01' });
  expect(obligations[0].appliesFrom).toBeUndefined();
  expect(obligations.some((obligation: { jurisdiction: string }) => obligation.jurisdiction === 'GG')).toBe(false);
});

test('statuses follow the date: a law applies from its first day, a law without a date applies, a bill stays proposed', () => {
  const at = (asOf: string) => mod.mapObligations(PRODUCT, RULE_TABLE, asOf).map(keyOf);
  expect(at('2027-05-31')).toContain('alpha-high-risk/credit-limit:upcoming');
  expect(at('2027-06-01')).toContain('alpha-high-risk/credit-limit:applies');
  expect(at('2026-02-28')).toContain('beta-state/cv-screening:upcoming');
  expect(at('2030-01-01')).toContain('alpha-bill/support-chat:proposed');
  expect(at('2020-01-01')).toContain('beta-federal/support-chat:applies');
  expect(mod.mapObligations({ ...PRODUCT, markets: ['GG'] }, RULE_TABLE, '2026-11-01').map(keyOf)).toEqual(['gamma-everything/credit-limit:applies', 'gamma-everything/cv-screening:applies', 'gamma-everything/support-chat:applies']);
});

test('summarize counts obligations per jurisdiction and status, and checkFreshness flags a rules table older than a quarter', () => {
  expect(mod.summarize(mod.mapObligations(PRODUCT, RULE_TABLE, '2026-11-01'))).toEqual({
    AA: { applies: 1, upcoming: 2, proposed: 1 },
    BB: { applies: 2, upcoming: 0, proposed: 0 },
    'BB-NORTH': { applies: 1, upcoming: 0, proposed: 0 },
  });
  expect(mod.summarize([])).toEqual({});
  expect(mod.checkFreshness('2026-10-31', '2026-11-30')).toEqual({ fresh: true, ageDays: 30 });
  expect(mod.checkFreshness('2026-10-31', '2027-01-31')).toEqual({ fresh: true, ageDays: 92 });
  expect(mod.checkFreshness('2026-10-31', '2027-02-01')).toEqual({ fresh: false, ageDays: 93 });
  expect(mod.checkFreshness('2026-10-31', '2026-12-31', 30)).toEqual({ fresh: false, ageDays: 61 });
});

test('the seeded rules table is dated and every rule names its source, status and a valid date', () => {
  expect(RULES_AS_OF).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  const ids = RULES.map((rule: { id: string }) => rule.id);
  expect(new Set(ids).size).toBe(ids.length);
  RULES.forEach((rule: { instrument: string; obligation: string; status: string; appliesFrom?: string; jurisdiction: string }) => {
    expect(rule.instrument.length).toBeGreaterThan(5);
    expect(rule.obligation.length).toBeGreaterThan(10);
    expect(['law', 'bill']).toContain(rule.status);
    if (rule.appliesFrom !== undefined) expect(Number.isNaN(Date.parse(rule.appliesFrom))).toBe(false);
    if (rule.status === 'bill') expect(rule.appliesFrom).toBeUndefined();
  });
  ['EU', 'BR', 'US', 'US-CA', 'US-CO', 'UK', 'CN', 'KR', 'JP'].forEach((jurisdiction) => expect(RULES.some((rule: { jurisdiction: string }) => rule.jurisdiction === jurisdiction)).toBe(true));
});

test('with the seeded table, an EU and Brazil hiring and support product gets dated obligations in both markets', () => {
  const product = {
    name: 'Talento',
    markets: ['EU', 'BR'],
    features: [
      { id: 'cv-screening', uses: ['employment-decision'], dataTypes: ['personal'], users: ['job-applicants'] },
      { id: 'candidate-chat', uses: ['chatbot'], dataTypes: ['personal'], users: ['job-applicants'] },
    ],
  };
  const now = mod.mapObligations(product, RULES, '2026-11-01');
  const keys = now.map(keyOf);
  expect(keys).toContain('eu-ai-act-annex3-employment/cv-screening:upcoming');
  expect(keys).toContain('eu-gdpr-art22/cv-screening:applies');
  expect(keys).toContain('eu-ai-act-art50-interaction/candidate-chat:applies');
  expect(keys).toContain('br-lgpd-art20-review/cv-screening:applies');
  expect(keys).toContain('br-pl-2338-high-risk/cv-screening:proposed');
  expect(now.every((obligation: { jurisdiction: string }) => ['EU', 'BR'].includes(obligation.jurisdiction))).toBe(true);
  expect(now.find((obligation: { ruleId: string }) => obligation.ruleId === 'eu-ai-act-annex3-employment').appliesFrom).toBe('2027-12-02');
  expect(mod.mapObligations(product, RULES, '2027-12-02').map(keyOf)).toContain('eu-ai-act-annex3-employment/cv-screening:applies');
  expect(mod.mapObligations(product, RULES, '2026-07-01').map(keyOf)).toContain('eu-ai-act-art50-interaction/candidate-chat:upcoming');
});
