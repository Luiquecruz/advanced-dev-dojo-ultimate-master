import { createModel } from '@dojo/ai';
import { fakeModel, respond } from '@dojo/ai/testing';
import { BudgetExceededError, createCostGovernor, governedGenerate } from './main';

const pricing = { inputPerMillion: 3, outputPerMillion: 15 };
let clock = Date.parse('2026-10-31T09:00:00Z');

async function main() {
  fakeModel.configure({ pricing });
  const governor = createCostGovernor({
    budgets: [
      { id: 'company-monthly', limitUsd: 50 },
      { id: 'support-team', team: 'support', limitUsd: 0.01 },
      { id: 'support-summaries', team: 'support', feature: 'summaries', limitUsd: 0.001 },
    ],
    rateLimits: { sales: { requests: 2, windowMs: 60_000 } },
    now: () => clock,
    onAlert: (alert) => console.log(`  ALERT ${alert.budgetId} reached ${Math.round(alert.threshold * 100)}%: $${alert.spentUsd.toFixed(5)} of $${alert.limitUsd}`),
  });
  const small = createModel({ model: 'acme-small-2026-05' });
  const large = createModel({ model: 'acme-large-2026-05' });
  fakeModel.handle(() => respond.text(['Customer reports a damaged package and wants a replacement.', 'Refund approved for order A-1001; label sent to the customer by email.', 'Hi Ana, following up on the proposal we discussed last week.']));

  const calls = [
    { model: small, context: { team: 'support', feature: 'summaries' }, maxTokens: 40 },
    { model: small, context: { team: 'support', feature: 'summaries' }, maxTokens: 40 },
    { model: large, context: { team: 'support', feature: 'replies' }, maxTokens: 300 },
    { model: small, context: { team: 'support', feature: 'summaries' }, maxTokens: 40 },
    { model: small, context: { team: 'sales', feature: 'emails' }, maxTokens: 150 },
    { model: small, context: { team: 'sales', feature: 'emails' }, maxTokens: 150 },
    { model: small, context: { team: 'sales', feature: 'emails' }, maxTokens: 150 },
  ];
  for (const call of calls) {
    clock += 5_000;
    const label = `${call.context.team}/${call.context.feature} on ${call.model.name}`;
    try {
      const response = await governedGenerate(governor, call.model, call.context, { messages: [{ role: 'user', content: 'Summarize ticket T-1: the package arrived damaged.' }], maxTokens: call.maxTokens }, pricing);
      console.log(`${label.padEnd(44)} $${response.usage.cost.toFixed(5)}`);
    } catch (error) {
      if (error instanceof BudgetExceededError) {
        console.log(`${label.padEnd(44)} refused before the call: ${error.message}`);
      }
    }
  }

  const report = governor.report();
  console.log(`\nspend $${report.totalUsd.toFixed(5)}`);
  for (const [name, totals] of Object.entries({ team: report.byTeam, feature: report.byFeature, model: report.byModel })) {
    console.log(`  by ${name}: ${Object.entries(totals).map(([key, value]) => `${key} $${value.toFixed(5)}`).join(', ')}`);
  }
}

main().catch((error) => console.error(`demo failed: ${error.message}`));
