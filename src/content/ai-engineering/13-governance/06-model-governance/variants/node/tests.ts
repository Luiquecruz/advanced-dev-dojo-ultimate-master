const { createModel } = require('@dojo/ai');

const NOW = Date.parse('2026-10-31T12:00:00Z');
const DAY = 24 * 60 * 60 * 1000;
const date = (days: number) => new Date(NOW + days * DAY).toISOString();
const GATE = { minimums: { 'support-golden': 0.85, 'refusal-safety': 0.95 }, maxRegression: 0.02 };

function registry(options: Record<string, unknown> = {}) {
  let clock = NOW;
  const created = mod.createModelRegistry({ now: () => clock, allowedLicenses: ['commercial-api', 'apache-2.0'], ...options });
  created.register({ id: 'acme-small-2026-05', provider: 'acme', license: 'commercial-api', retiresAt: date(20), replacement: 'acme-small-2026-09' });
  created.register({ id: 'acme-small-2026-09', provider: 'acme', license: 'commercial-api' });
  created.register({ id: 'open-7b-2026-06', provider: 'self-hosted', license: 'apache-2.0' });
  return { registry: created, advance: (days: number) => (clock += days * DAY) };
}

function scoreAll(target: { recordEval: (id: string, suite: string, score: number) => void }, id: string, golden: number, safety: number) {
  target.recordEval(id, 'support-golden', golden);
  target.recordEval(id, 'refusal-safety', safety);
}

test('register accepts pinned versions with approved licenses only', () => {
  const { registry: models } = registry();
  expect(() => models.register({ id: 'acme-small-2026-05', provider: 'acme', license: 'commercial-api' })).toThrow();
  expect(() => models.register({ id: 'acme-small-latest', provider: 'acme', license: 'commercial-api' })).toThrow();
  expect(() => models.register({ id: 'leaked-weights-2026-01', provider: 'unknown', license: 'research-only' })).toThrow();
  expect(() => models.recordEval('ghost-2026-01', 'support-golden', 0.9)).toThrow();
  models.register({ id: 'open-3b-2026-07', provider: 'self-hosted', license: 'apache-2.0' });
});

test('promotion requires every gate suite to have a result at or above its minimum', () => {
  const { registry: models } = registry();
  models.recordEval('acme-small-2026-09', 'support-golden', 0.8);
  expect(models.promote('support-default', 'acme-small-2026-09', GATE)).toEqual({ promoted: false, reasons: ['below-minimum:support-golden', 'missing-eval:refusal-safety'] });
  expect(models.promote('support-default', 'mystery-2026-01', GATE)).toEqual({ promoted: false, reasons: ['unknown-version'] });
  expect(() => models.resolve('support-default')).toThrow();
  scoreAll(models, 'acme-small-2026-09', 0.9, 0.97);
  expect(models.promote('support-default', 'acme-small-2026-09', GATE)).toEqual({ promoted: true, alias: 'support-default', versionId: 'acme-small-2026-09' });
  expect(models.resolve('support-default')).toEqual({ versionId: 'acme-small-2026-09', warnings: [] });
});

test('promotion blocks regressions beyond the tolerance against the currently pinned version', () => {
  const { registry: models } = registry();
  scoreAll(models, 'acme-small-2026-09', 0.93, 0.99);
  scoreAll(models, 'open-7b-2026-06', 0.9, 0.98);
  expect(models.promote('support-default', 'acme-small-2026-09', GATE).promoted).toBe(true);
  expect(models.promote('support-default', 'open-7b-2026-06', GATE)).toEqual({ promoted: false, reasons: ['regression:support-golden'] });
  models.recordEval('open-7b-2026-06', 'support-golden', 0.915);
  expect(models.promote('support-default', 'open-7b-2026-06', GATE)).toEqual({ promoted: true, alias: 'support-default', versionId: 'open-7b-2026-06', previous: 'acme-small-2026-09' });
});

test('retired versions cannot be promoted, and rollback restores the previous pin with a full history', () => {
  const { registry: models, advance } = registry();
  scoreAll(models, 'acme-small-2026-05', 0.9, 0.97);
  scoreAll(models, 'acme-small-2026-09', 0.91, 0.97);
  expect(models.promote('support-default', 'acme-small-2026-05', GATE).promoted).toBe(true);
  expect(models.promote('support-default', 'acme-small-2026-09', GATE).promoted).toBe(true);
  expect(models.rollback('support-default')).toBe('acme-small-2026-05');
  expect(models.resolve('support-default').versionId).toBe('acme-small-2026-05');
  expect(models.history('support-default')).toEqual(['acme-small-2026-05', 'acme-small-2026-09', 'acme-small-2026-05']);
  expect(() => models.rollback('support-default')).toThrow();
  advance(25);
  expect(models.promote('other-alias', 'acme-small-2026-05', GATE)).toEqual({ promoted: false, reasons: ['retired'] });
});

test('resolve warns before the pinned version retires and refuses after it retired', () => {
  const { registry: models, advance } = registry();
  scoreAll(models, 'acme-small-2026-05', 0.9, 0.97);
  models.promote('support-default', 'acme-small-2026-05', GATE);
  const { versionId, warnings } = models.resolve('support-default');
  expect(versionId).toBe('acme-small-2026-05');
  expect(warnings).toHaveLength(1);
  expect(warnings[0]).toContain('acme-small-2026-09');
  expect(warnings[0]).toContain('20 days');
  const quiet = registry({ warnWithinDays: 10 }).registry;
  scoreAll(quiet, 'acme-small-2026-05', 0.9, 0.97);
  quiet.promote('support-default', 'acme-small-2026-05', GATE);
  expect(quiet.resolve('support-default').warnings).toEqual([]);
  advance(20);
  expect(() => models.resolve('support-default')).toThrow();
  expect(() => models.resolve('unknown-alias')).toThrow();
});

test('generateWithAlias calls exactly the pinned version and reports its warnings', async () => {
  await forEachSeed(6, async () => {
    const { registry: models } = registry();
    scoreAll(models, 'acme-small-2026-05', 0.9, 0.97);
    scoreAll(models, 'open-7b-2026-06', 0.9, 0.97);
    models.promote('support-default', 'acme-small-2026-05', GATE);
    fakeModel.forModel('acme-small-2026-05').reply(respond.text(['Your order ships tomorrow.', 'Order A-1001 is on its way.']));
    fakeModel.forModel('open-7b-2026-06').reply(respond.text(['Shipped.', 'It is in transit.']));
    const warnings: string[] = [];
    const first = await mod.generateWithAlias(models, 'support-default', { messages: [{ role: 'user', content: 'Where is my order?' }] }, (warning: string) => warnings.push(warning));
    expect(first.model).toBe('acme-small-2026-05');
    expect(fakeModel.requests[0].model).toBe('acme-small-2026-05');
    expect(warnings).toHaveLength(1);
    models.promote('support-default', 'open-7b-2026-06', GATE);
    const second = await mod.generateWithAlias(models, 'support-default', { messages: [{ role: 'user', content: 'Where is my order?' }] });
    expect(second.model).toBe('open-7b-2026-06');
    expect(fakeModel.pending).toBe(0);
  });
});
