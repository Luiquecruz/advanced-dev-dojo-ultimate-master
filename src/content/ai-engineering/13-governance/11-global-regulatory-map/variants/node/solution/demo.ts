import { createModel } from '@dojo/ai';
import { fakeModel, respond } from '@dojo/ai/testing';
import { checkFreshness, mapObligations, summarize, type ProductProfile } from './main';
import { RULES, RULES_AS_OF } from './rules';

const DESCRIPTION = `Lumen Pay is a Brazilian fintech launching in Portugal and California.
It ships a customer support chatbot, an AI model that proposes credit-limit increases for consumers,
and a tool that generates marketing images.`;

const EXTRACTED: ProductProfile = {
  name: 'Lumen Pay',
  markets: ['BR', 'EU', 'US-CA'],
  features: [
    { id: 'support-chat', uses: ['chatbot'], dataTypes: ['personal'], users: ['consumers'] },
    { id: 'credit-limit', uses: ['credit-decision'], dataTypes: ['personal'], users: ['consumers'] },
    { id: 'marketing-images', uses: ['synthetic-media'], dataTypes: [], users: ['consumers'] },
  ],
};

function isProfile(value: unknown): value is ProductProfile {
  const candidate = value as ProductProfile;
  return typeof candidate?.name === 'string' && Array.isArray(candidate.markets) && Array.isArray(candidate.features) && candidate.features.every((feature) => typeof feature.id === 'string' && Array.isArray(feature.uses));
}

async function main() {
  fakeModel.reply(respond.json(EXTRACTED));
  const response = await createModel().generate({
    messages: [
      { role: 'system', content: 'Extract the product profile (markets, features with uses, data types and users) as JSON. A lawyer reviews it before use.' },
      { role: 'user', content: DESCRIPTION },
    ],
    responseFormat: { type: 'json' },
  });
  const profile: unknown = JSON.parse(response.text);
  if (!isProfile(profile)) {
    console.log('the extracted profile is invalid; ask a human to fill it in');
    return;
  }

  const asOf = '2026-11-01';
  const freshness = checkFreshness(RULES_AS_OF, asOf);
  console.log(`${profile.name}: ${profile.features.length} features in ${profile.markets.join(', ')}; rules table as of ${RULES_AS_OF} (${freshness.ageDays} day${freshness.ageDays === 1 ? '' : 's'} old, ${freshness.fresh ? 'fresh' : 'REVIEW NEEDED'})`);
  console.log('not legal advice: confirm every obligation with counsel\n');

  const obligations = mapObligations(profile, RULES, asOf);
  let jurisdiction = '';
  for (const obligation of obligations) {
    if (obligation.jurisdiction !== jurisdiction) {
      jurisdiction = obligation.jurisdiction;
      console.log(jurisdiction);
    }
    const when = obligation.status === 'upcoming' ? ` from ${obligation.appliesFrom}` : '';
    console.log(`  [${obligation.status}${when}] ${obligation.featureId}: ${obligation.instrument}`);
  }

  console.log('\nsummary:');
  for (const [name, counts] of Object.entries(summarize(obligations))) {
    console.log(`  ${name.padEnd(6)} applies ${counts.applies}, upcoming ${counts.upcoming}, proposed ${counts.proposed}`);
  }
}

main().catch((error) => console.error(`demo failed: ${error.message}`));
