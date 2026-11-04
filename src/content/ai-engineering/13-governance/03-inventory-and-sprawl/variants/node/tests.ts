const { createModel } = require('@dojo/ai');

const NOW = Date.parse('2026-10-31T12:00:00Z');
const DAY = 24 * 60 * 60 * 1000;
const at = (days: number) => new Date(NOW + days * DAY).toISOString();

const people = [
  { id: 'ana', active: true },
  { id: 'bruno', active: true },
  { id: 'carla', active: false },
];

function asset(overrides: Record<string, unknown>) {
  return { kind: 'agent', name: overrides.id, owner: 'ana', createdAt: at(-10), ...overrides };
}

test('register rejects duplicate ids, unknown kinds, missing owners and credentials without expiry', () => {
  const registry = mod.createRegistry();
  registry.register(asset({ id: 'support-agent' }));
  registry.register(asset({ id: 'key-support', kind: 'api-key', expiresAt: at(30) }));
  registry.register(asset({ id: 'model-small', kind: 'model', name: 'acme-small-2026-05' }));
  expect(() => registry.register(asset({ id: 'support-agent' }))).toThrow();
  expect(() => registry.register(asset({ id: 'mystery', kind: 'robot' }))).toThrow();
  expect(() => registry.register(asset({ id: 'no-owner', owner: '' }))).toThrow();
  expect(() => registry.register(asset({ id: 'blank-owner', owner: '   ' }))).toThrow();
  expect(() => registry.register(asset({ id: 'key-forever', kind: 'api-key' }))).toThrow();
  expect(registry.list().map((item: { id: string }) => item.id)).toEqual(['support-agent', 'key-support', 'model-small']);
  expect(registry.list('api-key').map((item: { id: string }) => item.id)).toEqual(['key-support']);
  expect(registry.get('model-small')).toMatchObject({ kind: 'model', name: 'acme-small-2026-05', owner: 'ana' });
  expect(registry.get('nothing')).toBeUndefined();
});

test('the registry hands out copies, and transferOwnership and retire update the stored record', () => {
  const registry = mod.createRegistry();
  registry.register(asset({ id: 'triage-agent', owner: 'carla' }));
  const copy = registry.get('triage-agent');
  copy.owner = 'mallory';
  registry.list()[0].owner = 'mallory';
  expect(registry.get('triage-agent').owner).toBe('carla');
  expect(registry.transferOwnership('triage-agent', 'bruno')).toMatchObject({ id: 'triage-agent', owner: 'bruno' });
  expect(registry.retire('triage-agent', at(0))).toMatchObject({ id: 'triage-agent', retiredAt: at(0) });
  expect(registry.get('triage-agent')).toMatchObject({ owner: 'bruno', retiredAt: at(0) });
  expect(() => registry.transferOwnership('ghost-agent', 'bruno')).toThrow();
  expect(() => registry.retire('ghost-agent', at(0))).toThrow();
});

test('auditInventory flags every asset whose owner left or is unknown', () => {
  const findings = mod.auditInventory(
    [asset({ id: 'pilot-agent', owner: 'carla', lastUsedAt: at(-1) }), asset({ id: 'docs-mcp', kind: 'mcp-server', owner: 'zed' }), asset({ id: 'support-agent', lastUsedAt: at(-1) })],
    people,
    { now: NOW },
  );
  expect(findings.filter((finding: { issue: string }) => finding.issue === 'orphaned').map((finding: { assetId: string }) => finding.assetId)).toEqual(['docs-mcp', 'pilot-agent']);
  findings.forEach((finding: { detail: string }) => expect(typeof finding.detail).toBe('string'));
  expect(findings.some((finding: { assetId: string }) => finding.assetId === 'support-agent')).toBe(false);
});

test('auditInventory flags expired and expiring credentials relative to the injected now', () => {
  const keys = [
    asset({ id: 'key-expired', kind: 'api-key', expiresAt: at(-3), lastUsedAt: at(-1) }),
    asset({ id: 'key-expires-now', kind: 'api-key', expiresAt: at(0), lastUsedAt: at(-1) }),
    asset({ id: 'key-expiring', kind: 'api-key', expiresAt: at(10), lastUsedAt: at(-1) }),
    asset({ id: 'key-edge', kind: 'api-key', expiresAt: at(14), lastUsedAt: at(-1) }),
    asset({ id: 'key-fine', kind: 'api-key', expiresAt: at(60), lastUsedAt: at(-1) }),
  ];
  const issues = (findings: Array<{ assetId: string; issue: string }>) => findings.map((finding) => `${finding.issue}:${finding.assetId}`);
  expect(issues(mod.auditInventory(keys, people, { now: NOW }))).toEqual(['expired:key-expired', 'expired:key-expires-now', 'expiring:key-edge', 'expiring:key-expiring']);
  expect(issues(mod.auditInventory(keys, people, { now: NOW, expiringWithinDays: 7 }))).toEqual(['expired:key-expired', 'expired:key-expires-now']);
  expect(issues(mod.auditInventory(keys, people, { now: NOW + 61 * DAY }))).toEqual(['expired:key-edge', 'expired:key-expired', 'expired:key-expires-now', 'expired:key-expiring', 'expired:key-fine']);
});

test('auditInventory flags idle keys and agents as stale, skips retired assets and sorts by issue then id', () => {
  const findings = mod.auditInventory(
    [
      asset({ id: 'report-agent', lastUsedAt: at(-120) }),
      asset({ id: 'key-unused', kind: 'api-key', createdAt: at(-200), expiresAt: at(200) }),
      asset({ id: 'key-recent', kind: 'api-key', createdAt: at(-200), expiresAt: at(200), lastUsedAt: at(-5) }),
      asset({ id: 'old-prompt', kind: 'prompt', createdAt: at(-400) }),
      asset({ id: 'retired-agent', owner: 'carla', lastUsedAt: at(-300), retiredAt: at(-200) }),
      asset({ id: 'alpha-agent', owner: 'carla', lastUsedAt: at(-91) }),
    ],
    people,
    { now: NOW },
  );
  expect(findings.map((finding: { assetId: string; issue: string }) => `${finding.issue}:${finding.assetId}`)).toEqual(['orphaned:alpha-agent', 'stale:alpha-agent', 'stale:key-unused', 'stale:report-agent']);
  expect(mod.auditInventory([asset({ id: 'report-agent', lastUsedAt: at(-120) })], people, { now: NOW, staleAfterDays: 180 })).toEqual([]);
});

test('logEntryFrom records the model and the tokens the provider reports, for every reply length', async () => {
  await forEachSeed(10, async () => {
    fakeModel.reply(respond.text(['Done.', 'Your refund was approved and will arrive within five business days.', 'I could not find that order; can you share the order number?']));
    const response = await createModel({ model: 'acme-small-2026-05' }).generate({ messages: [{ role: 'user', content: 'Where is my refund?' }] });
    const entry = mod.logEntryFrom(response, { keyId: 'key-support', agentId: 'support-agent', source: 'support-api', timestamp: at(0) });
    expect(entry).toMatchObject({ timestamp: at(0), keyId: 'key-support', agentId: 'support-agent', source: 'support-api', model: 'acme-small-2026-05', totalTokens: response.usage.totalTokens });
  });
  const response = await createModel().generate({ messages: [{ role: 'user', content: 'hi' }] });
  expect(mod.logEntryFrom(response, { keyId: 'key-x', source: 'laptop', timestamp: at(0) }).agentId).toBeUndefined();
});

test('detectShadowAi aggregates unregistered keys, models and agents and the use of retired assets', async () => {
  const assets = [
    asset({ id: 'support-agent' }),
    asset({ id: 'old-agent', retiredAt: at(-30) }),
    asset({ id: 'key-support', kind: 'api-key', expiresAt: at(30) }),
    asset({ id: 'key-old', kind: 'api-key', expiresAt: at(30), retiredAt: at(-30) }),
    asset({ id: 'model-small', kind: 'model', name: 'acme-small-2026-05' }),
  ];
  const calls: Array<[string, string | undefined, string, string]> = [
    ['acme-small-2026-05', 'support-agent', 'key-support', 'support-api'],
    ['acme-small-2026-05', 'support-agent', 'key-support', 'support-api'],
    ['frontier-x-latest', undefined, 'key-personal-7', 'marketing-laptop'],
    ['frontier-x-latest', undefined, 'key-personal-7', 'sales-laptop'],
    ['frontier-x-latest', undefined, 'key-personal-7', 'marketing-laptop'],
    ['acme-small-2026-05', 'invoice-bot', 'key-support', 'finance-cron'],
    ['acme-small-2026-05', 'old-agent', 'key-old', 'legacy-cron'],
  ];
  const log = [];
  for (const [model, agentId, keyId, source] of calls) {
    fakeModel.reply(respond.text('ok'));
    const response = await createModel({ model }).generate({ messages: [{ role: 'user', content: 'Summarize the open tickets.' }] });
    log.push(mod.logEntryFrom(response, { keyId, agentId, source, timestamp: at(0) }));
  }
  const signals = mod.detectShadowAi(assets, log);
  expect(signals.map((signal: { kind: string; value: string; calls: number }) => [signal.kind, signal.value, signal.calls])).toEqual([
    ['unregistered-model', 'frontier-x-latest', 3],
    ['unregistered-key', 'key-personal-7', 3],
    ['unregistered-agent', 'invoice-bot', 1],
    ['retired-asset', 'key-old', 1],
    ['retired-asset', 'old-agent', 1],
  ]);
  expect(signals[1].sources).toEqual(['marketing-laptop', 'sales-laptop']);
  expect(signals[1].totalTokens).toBe(log.slice(2, 5).reduce((sum: number, entry: { totalTokens: number }) => sum + entry.totalTokens, 0));
  expect(mod.detectShadowAi(assets, log.slice(0, 2))).toEqual([]);
});
