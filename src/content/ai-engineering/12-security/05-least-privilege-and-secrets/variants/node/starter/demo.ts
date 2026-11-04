import { createModel } from '@dojo/ai';
import type { Message } from '@dojo/ai';
import { fakeModel, respond } from '@dojo/ai/testing';
import { createCredentialBroker, executeToolCall, findLeakedSecrets } from './main';
import type { AuditEntry, ToolImplementation } from './main';

const VAULT = { CRM_API_KEY: 'crm_live_9f8e7d6c5b4a', SMTP_PASSWORD: 'p@ss word/42' };

const GRANTS = {
  crm_lookup: { scopes: ['crm:read'], secrets: ['CRM_API_KEY'] },
  send_email: { scopes: ['mail:send'], secrets: ['SMTP_PASSWORD'] },
};

let clock = 0;
const broker = createCredentialBroker({ grants: GRANTS, ttlMs: 60_000, now: () => clock });

const TOOLS: Record<string, ToolImplementation> = {
  crm_lookup: {
    scope: 'crm:read',
    execute(args, credential) {
      const check = broker.verify(credential.token, 'crm_lookup', 'crm:read');
      return `Customer ${args.customerId}: Ada Lovelace, plan pro (credential ${check.valid ? 'valid' : 'invalid'}, debug: key=${args.apiKey}, token=${credential.token})`;
    },
  },
  send_email: { scope: 'mail:send', execute: () => 'Email sent' },
};

async function main() {
  fakeModel.reply(
    respond.toolCalls([
      { name: 'crm_lookup', arguments: { customerId: 'c-42', apiKey: '{{secret:CRM_API_KEY}}' } },
      { name: 'crm_lookup', arguments: { customerId: 'c-43', apiKey: '{{secret:SMTP_PASSWORD}}' } },
    ]),
    respond.text('Customer c-42 is on the pro plan.'),
  );
  const model = createModel();
  const audit: AuditEntry[] = [];
  const messages: Message[] = [
    { role: 'system', content: 'Credentials are written as {{secret:NAME}} placeholders. Available: CRM_API_KEY, SMTP_PASSWORD.' },
    { role: 'user', content: 'Which plan is customer c-42 on?' },
  ];
  const first = await model.generate({ messages, tools: Object.keys(TOOLS).map((name) => ({ name })) });
  messages.push({ role: 'assistant', content: first.text, toolCalls: first.toolCalls });
  for (const call of first.toolCalls) {
    clock += 1_000;
    const message = await executeToolCall(call, { tools: TOOLS, broker, vault: VAULT, audit });
    console.log(`${call.name} ${call.arguments}\n  -> ${message.content}`);
    messages.push(message);
  }
  const final = await model.generate({ messages });
  console.log(`\nanswer: ${final.text}`);
  console.log('audit log:');
  audit.forEach((entry) => console.log(`  ${entry.tool} [${entry.scope}] ${JSON.stringify(entry.arguments)}`));
  const sent = fakeModel.requests.flatMap((request) => request.messages);
  console.log(`secrets that reached the model: [${findLeakedSecrets(sent, VAULT).join(', ')}]`);
}

main().catch((error) => console.error(`demo failed: ${error.message}`));
