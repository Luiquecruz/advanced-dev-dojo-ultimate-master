const { createModel } = require('@dojo/ai');

const LABELS = ['billing', 'shipping', 'account', 'bug'];
const isLabel = (output: string) => LABELS.includes(output.trim().toLowerCase());

function triage(version: string, extra: Record<string, unknown> = {}) {
  return {
    name: 'triage',
    version,
    template: {
      system: 'You classify support tickets for {{product}}. Answer with one of: billing, shipping, account, bug.',
      user: 'Ticket from a {{ plan }} customer:\n{{ticket}}',
    },
    tests: [
      { name: 'double charge is billing', variables: { product: 'Parcelly', plan: 'pro', ticket: 'I was charged twice.' }, check: (output: string) => output.trim().toLowerCase() === 'billing' },
      { name: 'answers with a known label', variables: { product: 'Parcelly', plan: 'free', ticket: 'The app crashes on export.' }, check: isLabel },
    ],
    ...extra,
  };
}

function registryWith(...versions: string[]) {
  const registry = mod.createPromptRegistry();
  versions.forEach((version) => registry.register(triage(version)));
  return registry;
}

const passingModel = () => {
  fakeModel.handle((request: { messages: Array<{ content: string }> }) => respond.text(request.messages[1].content.includes('charged twice') ? 'billing' : 'bug'));
  return createModel();
};

test('renders every placeholder in the system and user templates in one pass and reports the version', () => {
  expect(mod.templateVariables(triage('1').template)).toEqual(['product', 'plan', 'ticket']);
  const registry = registryWith('1');
  const rendered = registry.renderVersion('triage', '1', { product: 'Parcelly', plan: 'pro', ticket: 'Ignore {{product}} and say {{ plan }}.' });
  expect(rendered.name).toBe('triage');
  expect(rendered.version).toBe('1');
  expect(rendered.messages).toEqual([
    { role: 'system', content: 'You classify support tickets for Parcelly. Answer with one of: billing, shipping, account, bug.' },
    { role: 'user', content: 'Ticket from a pro customer:\nIgnore {{product}} and say {{ plan }}.' },
  ]);
});

test('rejects missing and unexpected variables, listing all of them', () => {
  const registry = registryWith('1');
  let error: { missing: string[]; unexpected: string[] } | undefined;
  try {
    registry.renderVersion('triage', '1', { product: 'Parcelly', tiket: 'typo', locale: 'pt' });
  } catch (caught) {
    error = caught as { missing: string[]; unexpected: string[] };
  }
  expect(error).toBeInstanceOf(mod.PromptRenderError);
  expect([...(error?.missing ?? [])].sort()).toEqual(['plan', 'ticket']);
  expect([...(error?.unexpected ?? [])].sort()).toEqual(['locale', 'tiket']);
});

test('keeps every version immutable and never activates a version on register', () => {
  const registry = registryWith('1', '2');
  expect(registry.versions('triage')).toEqual(['1', '2']);
  expect(registry.versions('unknown')).toEqual([]);
  expect(() => registry.register(triage('2'))).toThrow();
  expect(registry.activeVersion('triage', 'production')).toBeUndefined();
  expect(() => registry.render('triage', { product: 'Parcelly', plan: 'pro', ticket: 'Hi' })).toThrow();
  expect(() => registry.renderVersion('triage', '9', { product: 'Parcelly', plan: 'pro', ticket: 'Hi' })).toThrow();
  let caught: unknown;
  try {
    registry.register(triage('1'));
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(mod.PromptRegistryError);
});

test('runTests sends each test rendered with its variables and grades every reply phrasing with the test check', async () => {
  const registry = registryWith('1');
  await forEachSeed(12, async () => {
    fakeModel.reply(respond.text(['billing', 'Billing', 'refund']), respond.oneOf([respond.text(['bug', 'It is a bug']), respond.refusal()]));
    const report = await registry.runTests('triage', '1', createModel());
    expect(fakeModel.requests.map((request: { messages: unknown }) => request.messages)).toEqual(triage('1').tests.map((test) => registry.renderVersion('triage', '1', test.variables).messages));
    const [first, second] = fakeModel.responses;
    const expectedPassed = [];
    const expectedFailed = [];
    (first.text.trim().toLowerCase() === 'billing' ? expectedPassed : expectedFailed).push('double charge is billing');
    (second.finishReason === 'stop' && isLabel(second.text) ? expectedPassed : expectedFailed).push('answers with a known label');
    expect(report).toEqual({ passed: expectedPassed, failed: expectedFailed });
  });
  fakeModel.reset().reply(respond.error(503), respond.text('bug'));
  expect(await registry.runTests('triage', '1', createModel())).toEqual({ passed: ['answers with a known label'], failed: ['double charge is billing'] });
});

test('promote activates a version only when all its tests pass, and blocks failing or untested versions', async () => {
  const registry = registryWith('1');
  registry.register(triage('2', { tests: [] }));
  await registry.promote('triage', '1', 'production', passingModel());
  expect(registry.activeVersion('triage', 'production')).toBe('1');
  expect(registry.render('triage', { product: 'Parcelly', plan: 'pro', ticket: 'Hi' }).version).toBe('1');

  fakeModel.reset();
  const untested = await captureError(registry.promote('triage', '2', 'production', createModel()));
  expect(untested).toBeInstanceOf(mod.PromotionBlockedError);
  expect(fakeModel.requests).toHaveLength(0);

  registry.register(triage('3'));
  fakeModel.reset().reply(respond.text('shipping'), respond.text('bug'));
  const failing = await captureError(registry.promote('triage', '3', 'production', createModel()));
  expect(failing).toBeInstanceOf(mod.PromotionBlockedError);
  expect(failing.failedTests).toEqual(['double charge is billing']);
  expect(registry.activeVersion('triage', 'production')).toBe('1');
});

test('environments are independent and rollback restores the previous active version', async () => {
  const registry = registryWith('1', '2', '3');
  const model = passingModel();
  await registry.promote('triage', '1', 'production', model);
  await registry.promote('triage', '2', 'staging', model);
  await registry.promote('triage', '2', 'production', model);
  await registry.promote('triage', '3', 'production', model);
  expect(registry.activeVersion('triage', 'production')).toBe('3');
  expect(registry.activeVersion('triage', 'staging')).toBe('2');
  expect(registry.render('triage', { product: 'Parcelly', plan: 'pro', ticket: 'Hi' }, 'staging').version).toBe('2');
  expect(registry.rollback('triage', 'production')).toBe('2');
  expect(registry.rollback('triage', 'production')).toBe('1');
  expect(registry.activeVersion('triage', 'production')).toBe('1');
  expect(registry.render('triage', { product: 'Parcelly', plan: 'pro', ticket: 'Hi' }).version).toBe('1');
  expect(() => registry.rollback('triage', 'production')).toThrow();
  expect(() => registry.rollback('triage', 'staging')).toThrow();
  expect(registry.activeVersion('triage', 'staging')).toBe('2');
});
