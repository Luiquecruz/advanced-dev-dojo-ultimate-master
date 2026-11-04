import { fakeModel, respond } from '@dojo/ai/testing';
import { createModelRegistry, generateWithAlias, type PromotionResult } from './main';

const DAY = 24 * 60 * 60 * 1000;
let clock = Date.parse('2026-10-31T12:00:00Z');
const date = (days: number) => new Date(clock + days * DAY).toISOString();
const gate = { minimums: { 'support-golden': 0.85, 'refusal-safety': 0.95 }, maxRegression: 0.02 };

function show(label: string, result: PromotionResult) {
  console.log(`${label}: ${result.promoted ? `promoted${result.previous ? ` (previous ${result.previous})` : ''}` : `blocked by ${result.reasons.join(', ')}`}`);
}

function tryRegister(action: () => void) {
  try {
    action();
  } catch (error) {
    console.log(`register refused: ${(error as Error).message}`);
  }
}

async function ask(registry: ReturnType<typeof createModelRegistry>) {
  const response = await generateWithAlias(registry, 'support-default', { messages: [{ role: 'user', content: 'Where is order A-1001?' }] }, (warning) => console.log(`  warning: ${warning}`));
  console.log(`  answered by ${response.model}: ${response.text}`);
}

async function main() {
  const registry = createModelRegistry({ now: () => clock, allowedLicenses: ['commercial-api', 'apache-2.0'] });
  registry.register({ id: 'acme-small-2026-05', provider: 'acme', license: 'commercial-api', retiresAt: date(21), replacement: 'acme-small-2026-09' });
  registry.register({ id: 'acme-small-2026-09', provider: 'acme', license: 'commercial-api' });
  registry.register({ id: 'open-7b-2026-06', provider: 'self-hosted', license: 'apache-2.0' });
  tryRegister(() => registry.register({ id: 'acme-small-latest', provider: 'acme', license: 'commercial-api' }));
  tryRegister(() => registry.register({ id: 'leaked-70b-2026-02', provider: 'unknown', license: 'research-only' }));

  registry.recordEval('acme-small-2026-05', 'support-golden', 0.9);
  registry.recordEval('acme-small-2026-05', 'refusal-safety', 0.97);
  show('pin support-default to acme-small-2026-05', registry.promote('support-default', 'acme-small-2026-05', gate));

  fakeModel.forModel('acme-small-2026-05').reply(respond.text('Order A-1001 left the warehouse this morning.'));
  await ask(registry);

  registry.recordEval('open-7b-2026-06', 'support-golden', 0.86);
  registry.recordEval('open-7b-2026-06', 'refusal-safety', 0.96);
  show('try open-7b-2026-06', registry.promote('support-default', 'open-7b-2026-06', gate));

  registry.recordEval('acme-small-2026-09', 'support-golden', 0.92);
  show('try acme-small-2026-09 before its safety eval', registry.promote('support-default', 'acme-small-2026-09', gate));
  registry.recordEval('acme-small-2026-09', 'refusal-safety', 0.98);
  show('try acme-small-2026-09 with every eval', registry.promote('support-default', 'acme-small-2026-09', gate));

  fakeModel.forModel('acme-small-2026-09').reply(respond.text('Order A-1001 is in transit and arrives Tuesday.'));
  await ask(registry);

  console.log(`incident: rollback to ${registry.rollback('support-default')}`);
  fakeModel.forModel('acme-small-2026-05').reply(respond.text('Order A-1001 left the warehouse this morning.'));
  await ask(registry);

  clock += 22 * DAY;
  try {
    registry.resolve('support-default');
  } catch (error) {
    console.log(`22 days later: ${(error as Error).message}`);
  }
  console.log(`history: ${registry.history('support-default').join(' -> ')}`);
}

main().catch((error) => console.error(`demo failed: ${error.message}`));
