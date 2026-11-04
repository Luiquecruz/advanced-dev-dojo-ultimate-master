import { createModel } from '@dojo/ai';
import { fakeModel, respond } from '@dojo/ai/testing';
import { auditInventory, createRegistry, detectShadowAi, logEntryFrom, type GatewayLogEntry } from './main';

const NOW = Date.parse('2026-10-31T12:00:00Z');
const DAY = 24 * 60 * 60 * 1000;
const at = (days: number) => new Date(NOW + days * DAY).toISOString();

const people = [
  { id: 'ana', active: true },
  { id: 'bruno', active: true },
  { id: 'carla', active: false },
];

function seedRegistry() {
  const registry = createRegistry();
  registry.register({ id: 'model-small', kind: 'model', name: 'acme-small-2026-05', owner: 'ana', createdAt: at(-150) });
  registry.register({ id: 'support-agent', kind: 'agent', name: 'Support assistant', owner: 'ana', createdAt: at(-120), lastUsedAt: at(-1) });
  registry.register({ id: 'pilot-agent', kind: 'agent', name: 'Q1 pricing pilot', owner: 'carla', createdAt: at(-240), lastUsedAt: at(-150) });
  registry.register({ id: 'docs-mcp', kind: 'mcp-server', name: 'Internal docs MCP server', owner: 'bruno', createdAt: at(-60) });
  registry.register({ id: 'key-support', kind: 'api-key', name: 'Support gateway key', owner: 'ana', createdAt: at(-120), expiresAt: at(9), lastUsedAt: at(-1) });
  registry.register({ id: 'key-pilot', kind: 'api-key', name: 'Pilot key', owner: 'carla', createdAt: at(-240), expiresAt: at(-20), lastUsedAt: at(-150) });
  try {
    registry.register({ id: 'key-forever', kind: 'api-key', name: 'Key with no expiry', owner: 'bruno', createdAt: at(0) });
  } catch (error) {
    console.log(`rejected: ${(error as Error).message}`);
  }
  return registry;
}

async function collectGatewayLog(): Promise<GatewayLogEntry[]> {
  const traffic: Array<{ model: string; agentId?: string; keyId: string; source: string }> = [
    { model: 'acme-small-2026-05', agentId: 'support-agent', keyId: 'key-support', source: 'support-api' },
    { model: 'acme-small-2026-05', agentId: 'support-agent', keyId: 'key-support', source: 'support-api' },
    { model: 'frontier-x-latest', keyId: 'key-personal-7', source: 'marketing-laptop' },
    { model: 'frontier-x-latest', keyId: 'key-personal-7', source: 'marketing-laptop' },
    { model: 'frontier-x-latest', keyId: 'key-personal-7', source: 'sales-laptop' },
    { model: 'acme-small-2026-05', agentId: 'invoice-bot', keyId: 'key-support', source: 'finance-cron' },
  ];
  const log: GatewayLogEntry[] = [];
  for (const call of traffic) {
    fakeModel.reply(respond.text(['Here is the summary you asked for.', 'Draft ready: three campaigns, two pending approval, one blocked on legal review.']));
    const response = await createModel({ model: call.model }).generate({ messages: [{ role: 'user', content: 'Summarize this customer list for the campaign.' }] });
    log.push(logEntryFrom(response, { ...call, timestamp: at(0) }));
  }
  return log;
}

async function main() {
  const registry = seedRegistry();
  console.log(`registry: ${registry.list().length} assets, ${registry.list('api-key').length} credentials`);

  console.log('\ninventory audit:');
  for (const finding of auditInventory(registry.list(), people, { now: NOW })) {
    console.log(`  ${finding.issue.padEnd(9)} ${finding.assetId.padEnd(14)} ${finding.detail}`);
  }

  registry.transferOwnership('pilot-agent', 'bruno');
  registry.retire('key-pilot', at(0));
  console.log('\nafter transferring pilot-agent to bruno and retiring key-pilot:');
  for (const finding of auditInventory(registry.list(), people, { now: NOW })) {
    console.log(`  ${finding.issue.padEnd(9)} ${finding.assetId.padEnd(14)} ${finding.detail}`);
  }

  console.log('\nshadow AI signals from the gateway log:');
  for (const signal of detectShadowAi(registry.list(), await collectGatewayLog())) {
    console.log(`  ${signal.kind.padEnd(18)} ${signal.value.padEnd(18)} ${signal.calls} call${signal.calls === 1 ? '' : 's'}, ${signal.totalTokens} tokens from ${signal.sources.join(', ')}`);
  }
}

main().catch((error) => console.error(`demo failed: ${error.message}`));
