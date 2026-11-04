const { adr, governancePlan } = mod;

const LAYERS = ['organizational', 'regulatory', 'data', 'model', 'agent-identity', 'application', 'operational-cost', 'engineering', 'audit'];
const OWNERS = ['cto', 'ai-platform-team', 'data-protection-officer', 'legal-compliance', 'security-team', 'credit-product-team', 'support-product-team', 'finance-finops', 'engineering-leadership', 'internal-audit'];
const LEGAL_BASES = ['consent', 'contract', 'legitimate-interest', 'legal-obligation', 'credit-protection'];
const CUSTOMER_FEATURES = ['support-chat', 'credit-limit', 'collections-email'];

const layer = (name: string) => governancePlan.layers.find((item: { layer: string }) => item.layer === name);
const obligation = (feature: string, jurisdiction: string, instrument: RegExp) =>
  governancePlan.regulatory.obligations.find((item: { feature: string; jurisdiction: string; instrument: string }) => item.feature === feature && item.jurisdiction === jurisdiction && instrument.test(item.instrument));

test('the ADR is an accepted governance decision whose context names the sprawl findings and the regulation, with a "We will" decision', () => {
  expect(Number.isInteger(adr.id) && adr.id > 0).toBe(true);
  expect(adr.status).toBe('accepted');
  expect(adr.layer).toBe('governance');
  expect(adr.title.trim().length).toBeGreaterThanOrEqual(10);
  expect(adr.context.trim().length).toBeGreaterThanOrEqual(80);
  expect(adr.context).toMatch(/owner|sprawl|shadow|shared key/i);
  expect(adr.context).toMatch(/LGPD|GDPR|AI Act/);
  expect(adr.decision.trim().length).toBeGreaterThanOrEqual(40);
  expect(adr.decision.trim()).toMatch(/^we will\b/i);
});

test('lists at least two distinct rejected alternatives with reasons, and positive and negative consequences', () => {
  expect(adr.alternatives.length).toBeGreaterThanOrEqual(2);
  adr.alternatives.forEach((alternative: { option: string; reason: string }) => {
    expect(alternative.option.trim().length).toBeGreaterThanOrEqual(3);
    expect(alternative.reason.trim().length).toBeGreaterThanOrEqual(20);
  });
  const options = adr.alternatives.map((alternative: { option: string }) => alternative.option.trim().toLowerCase());
  expect(new Set(options).size).toBe(options.length);
  ['positive', 'negative'].forEach((side) => {
    expect(adr.consequences[side].length).toBeGreaterThanOrEqual(1);
    adr.consequences[side].forEach((item: string) => expect(item.trim().length).toBeGreaterThanOrEqual(15));
  });
});

test('every governance layer appears once with a real owner, controls, an enforcement point and evidence, and no layer that must run at runtime is left to process', () => {
  expect(governancePlan.layers.map((item: { layer: string }) => item.layer).sort()).toEqual([...LAYERS].sort());
  governancePlan.layers.forEach((item: { owner: string; controls: string[]; enforcement: string; evidence: string }) => {
    expect(OWNERS).toContain(item.owner);
    expect(item.controls.length).toBeGreaterThanOrEqual(1);
    expect(['runtime', 'ci', 'process']).toContain(item.enforcement);
    expect(item.evidence.trim().length).toBeGreaterThanOrEqual(10);
  });
  ['data', 'agent-identity', 'operational-cost'].forEach((name) => expect(layer(name).enforcement).toBe('runtime'));
  expect(['ci', 'runtime']).toContain(layer('model').enforcement);
  expect(layer('data').owner).toBe('data-protection-officer');
  expect(layer('regulatory').owner).toBe('legal-compliance');
  expect(layer('audit').owner).not.toBe(layer('agent-identity').owner);
  expect(layer('audit').owner).not.toBe('ai-platform-team');
});

test('inventory and identity fix the sprawl findings: owners, expiring credentials, a sanctioned alternative, one identity per agent and tamper-evident audit', () => {
  const { inventory, identity } = governancePlan;
  expect(inventory.requireOwner).toBe(true);
  expect(inventory.credentialMaxTtlDays).toBeGreaterThan(0);
  expect(inventory.credentialMaxTtlDays).toBeLessThanOrEqual(90);
  expect(inventory.auditEveryDays).toBeGreaterThan(0);
  expect(inventory.auditEveryDays).toBeLessThanOrEqual(30);
  expect(inventory.shadowAiResponse).toBe('sanctioned-alternative');
  expect(identity).toMatchObject({ perAgentIdentity: true, sharedKeysAllowed: false, decisionPoint: 'every-tool-call', defaultEffect: 'deny', auditLog: 'hash-chained', killSwitch: true });
  expect(identity.auditRetentionYears).toBeGreaterThanOrEqual(5);
});

test('data and model governance follow the briefing: a purpose and legal basis per customer feature, allowlist minimization, 90-day retention, pinned and eval-gated models migrated in time', () => {
  const { data, models } = governancePlan;
  CUSTOMER_FEATURES.forEach((feature) => {
    const purpose = data.purposes.find((item: { feature: string }) => item.feature === feature);
    expect(purpose).toBeDefined();
    expect(LEGAL_BASES).toContain(purpose.legalBasis);
  });
  data.purposes.filter((item: { name: string }) => /marketing/i.test(item.name)).forEach((item: { legalBasis: string }) => expect(item.legalBasis).toBe('consent'));
  expect(data.minimization).toBe('allowlist');
  expect(data.retentionDays).toBeGreaterThan(0);
  expect(data.retentionDays).toBeLessThanOrEqual(90);
  expect(data.providerTraining).toBe('opted-out');
  expect(models.pinnedVersions).toBe(true);
  ['support-golden', 'credit-fairness', 'refusal-safety'].forEach((suite) => expect(models.requiredEvals).toContain(suite));
  expect(models.maxRegression).toBeGreaterThanOrEqual(0);
  expect(models.maxRegression).toBeLessThanOrEqual(0.05);
  expect(Number.isNaN(Date.parse(models.migrationStartBy))).toBe(false);
  expect(Date.parse('2027-01-15') - Date.parse(models.migrationStartBy)).toBeGreaterThanOrEqual(30 * 24 * 60 * 60 * 1000);
});

test('cost governance fits the monthly budget, covers every AI feature, alerts before the limit and stops runaway loops', () => {
  const { cost } = governancePlan;
  expect(cost.monthlyLimitUsd).toBeGreaterThan(0);
  expect(cost.monthlyLimitUsd).toBeLessThanOrEqual(12000);
  const total = cost.budgets.reduce((sum: number, budget: { limitUsd: number }) => sum + budget.limitUsd, 0);
  expect(total).toBeLessThanOrEqual(cost.monthlyLimitUsd);
  [...CUSTOMER_FEATURES, 'coding-assistant'].forEach((feature) => expect(cost.budgets.some((budget: { feature?: string }) => budget.feature === feature)).toBe(true));
  cost.budgets.forEach((budget: { limitUsd: number }) => expect(budget.limitUsd).toBeGreaterThan(0));
  expect(cost.alertThresholds.some((threshold: number) => threshold > 0 && threshold < 1)).toBe(true);
  expect(cost.hardLimit).toBe(true);
  expect(cost.rateLimitPerAgent).toBe(true);
});

test('credit decisions keep meaningful human oversight, and the regulatory map covers Brazil and the EU with the right statuses', () => {
  const { oversight, regulatory } = governancePlan;
  expect(oversight.creditDecisions).not.toBe('none');
  expect(oversight.reviewQueueMaxPerAnalystPerDay).toBeGreaterThan(0);
  expect(oversight.reviewQueueMaxPerAnalystPerDay).toBeLessThanOrEqual(80);
  expect(oversight.overrideRateTracked).toBe(true);
  expect(oversight.appealPath).toBe(true);
  expect([...regulatory.markets].sort()).toEqual(['BR', 'EU']);
  expect(regulatory.reviewEveryDays).toBeGreaterThan(0);
  expect(regulatory.reviewEveryDays).toBeLessThanOrEqual(92);
  expect(obligation('credit-limit', 'BR', /LGPD/)?.status).toBe('applies');
  expect(obligation('credit-limit', 'BR', /LGPD.*20|20.*LGPD/)).toBeDefined();
  expect(obligation('credit-limit', 'EU', /GDPR.*22|22.*GDPR/)?.status).toBe('applies');
  expect(obligation('credit-limit', 'EU', /AI Act/)?.status).toBe('upcoming');
  expect(obligation('support-chat', 'EU', /AI Act.*50|50.*AI Act/)?.status).toBe('applies');
  regulatory.obligations.forEach((item: { jurisdiction: string; instrument: string; status: string }) => {
    expect(['BR', 'EU']).toContain(item.jurisdiction);
    if (/PL\s*2338/.test(item.instrument)) expect(item.status).toBe('proposed');
  });
});
