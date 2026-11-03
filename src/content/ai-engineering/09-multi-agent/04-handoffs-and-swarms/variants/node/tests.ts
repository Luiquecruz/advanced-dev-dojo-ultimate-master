const { createModel } = require('@dojo/ai');

const AGENTS = {
  triage: { name: 'triage', instructions: 'You are triage. Route the customer to the right specialist.', handoffs: ['billing', 'tech'] },
  billing: { name: 'billing', instructions: 'You are billing. Handle invoices and charges.', handoffs: ['refunds', 'tech'] },
  tech: { name: 'tech', instructions: 'You are tech support. Handle bugs and outages.', handoffs: ['billing'] },
  refunds: { name: 'refunds', instructions: 'You are refunds. Decide and issue refunds.', handoffs: [] },
};
const QUESTION = 'I was charged twice for my March invoice, please fix it.';

type Request = { messages: Array<{ role: string; content: string; toolCalls?: Array<{ id: string; name: string }>; toolCallId?: string }>; tools?: Array<{ name: string }> };

const systemOf = (request: Request) => request.messages[0].content;
const agentOf = (request: Request) => Object.values(AGENTS).find((agent) => agent.instructions === systemOf(request))!.name;
const options = (extra: Record<string, unknown> = {}) => ({ model: createModel(), agents: AGENTS, entry: 'triage', maxHandoffs: 4, maxTurns: 8, ...extra });

test('names handoff tools after their target and offers only the allowed targets, each requiring a reason', () => {
  expect(mod.handoffToolName('billing')).toBe('transfer_to_billing');
  expect(mod.handoffToolName('Tech Support')).toBe('transfer_to_tech_support');
  expect(mod.handoffToolName('Refunds (EU)')).toBe('transfer_to_refunds_eu');
  const tools = mod.handoffTools(AGENTS.triage);
  expect(tools.map((tool: { name: string }) => tool.name)).toEqual(['transfer_to_billing', 'transfer_to_tech']);
  tools.forEach((tool: { description: string; parameters: { type: string; properties: Record<string, { type: string }>; required: string[] } }) => {
    expect(tool.description.length).toBeGreaterThan(10);
    expect(tool.parameters.type).toBe('object');
    expect(tool.parameters.properties.reason.type).toBe('string');
    expect(tool.parameters.required).toContain('reason');
  });
  expect(mod.handoffTools(AGENTS.refunds)).toEqual([]);
});

test('isPingPong detects two agents bouncing control back and forth', () => {
  expect(mod.isPingPong(['billing', 'tech', 'billing', 'tech'])).toBe(true);
  expect(mod.isPingPong(['triage', 'billing', 'tech', 'billing', 'tech'])).toBe(true);
  expect(mod.isPingPong(['billing', 'tech', 'billing'])).toBe(false);
  expect(mod.isPingPong(['triage', 'billing', 'tech', 'billing'])).toBe(false);
  expect(mod.isPingPong(['triage', 'billing', 'refunds', 'billing'])).toBe(false);
  expect(mod.isPingPong(['billing', 'tech', 'triage', 'tech'])).toBe(false);
  expect(mod.isPingPong(['billing', 'billing', 'billing', 'billing'])).toBe(false);
});

test('the entry agent answers directly with its own instructions and handoff tools', async () => {
  fakeModel.reply(respond.text('Your invoice is fine; the second charge is a pending authorization.'));
  const result = await mod.runSwarm(QUESTION, options());
  expect(result).toEqual({
    status: 'answered',
    answer: 'Your invoice is fine; the second charge is a pending authorization.',
    agent: 'triage',
    path: ['triage'],
    handoffs: [],
    turns: 1,
  });
  expect(fakeModel.requests[0].messages).toEqual([
    { role: 'system', content: AGENTS.triage.instructions },
    { role: 'user', content: QUESTION },
  ]);
  expect(fakeModel.requests[0].tools.map((tool: { name: string }) => tool.name)).toEqual(['transfer_to_billing', 'transfer_to_tech']);
});

test('a handoff passes control and the conversation to the target agent', async () => {
  fakeModel.reply(
    respond.toolCall('transfer_to_billing', { reason: 'duplicate charge' }),
    respond.toolCall('transfer_to_refunds', { reason: 'customer needs a refund' }),
    respond.text('Refund of the duplicate charge issued.'),
  );
  const result = await mod.runSwarm(QUESTION, options());
  expect(result).toEqual({
    status: 'answered',
    answer: 'Refund of the duplicate charge issued.',
    agent: 'refunds',
    path: ['triage', 'billing', 'refunds'],
    handoffs: [
      { from: 'triage', to: 'billing', reason: 'duplicate charge' },
      { from: 'billing', to: 'refunds', reason: 'customer needs a refund' },
    ],
    turns: 3,
  });
  const second = fakeModel.requests[1];
  expect(systemOf(second)).toBe(AGENTS.billing.instructions);
  expect(second.tools.map((tool: { name: string }) => tool.name)).toEqual(['transfer_to_refunds', 'transfer_to_tech']);
  const firstCall = fakeModel.responses[0].toolCalls[0];
  expect(second.messages.slice(1)).toMatchObject([
    { role: 'user', content: QUESTION },
    { role: 'assistant', toolCalls: [{ id: firstCall.id, name: 'transfer_to_billing' }] },
    { role: 'tool', toolCallId: firstCall.id },
  ]);
  const note = second.messages[3].content;
  ['triage', 'billing', 'duplicate charge'].forEach((part) => expect(note).toContain(part));
  const third = fakeModel.requests[2];
  expect(systemOf(third)).toBe(AGENTS.refunds.instructions);
  expect(third.messages.filter((message: { role: string }) => message.role !== 'system')).toHaveLength(5);
  expect(third.tools).toEqual([]);
});

test('a handoff the current agent may not make is rejected and the same agent continues', async () => {
  fakeModel.reply(
    respond.toolCall('transfer_to_refunds', { reason: 'skip billing' }),
    respond.unknownTool('transfer_to_legal'),
    respond.invalidToolArguments('transfer_to_billing'),
    respond.text('Billing confirmed the duplicate charge.'),
  );
  const result = await mod.runSwarm(QUESTION, options());
  expect(result.status).toBe('answered');
  expect(result.path).toEqual(['triage', 'billing']);
  expect(result.handoffs).toEqual([{ from: 'triage', to: 'billing', reason: '' }]);
  expect(result.turns).toBe(4);
  expect(fakeModel.requests.slice(0, 3).map(agentOf)).toEqual(['triage', 'triage', 'triage']);
  const second = fakeModel.requests[1].messages;
  const rejection = second[second.length - 1];
  expect(rejection.role).toBe('tool');
  expect(rejection.toolCallId).toBe(fakeModel.responses[0].toolCalls[0].id);
  expect(rejection.content).toContain('transfer_to_refunds');
  const third = fakeModel.requests[2].messages;
  expect(third[third.length - 1].content).toContain('transfer_to_legal');
});

test('stops when two agents bounce control back and forth', async () => {
  fakeModel.handle((request: Request) =>
    agentOf(request) === 'billing' ? respond.toolCall('transfer_to_tech', { reason: 'looks technical' }) : respond.toolCall('transfer_to_billing', { reason: 'looks like billing' }),
  );
  const result = await mod.runSwarm(QUESTION, options({ entry: 'billing', maxHandoffs: 10, maxTurns: 20 }));
  expect(result.status).toBe('ping_pong');
  expect(result.answer).toBe(null);
  expect(result.path).toEqual(['billing', 'tech', 'billing']);
  expect(result.agent).toBe('billing');
  expect(result.handoffs).toHaveLength(2);
  expect(fakeModel.requests).toHaveLength(3);
});

test('stops on the handoff limit and on the turn limit', async () => {
  fakeModel.reply(
    respond.toolCall('transfer_to_billing', { reason: 'a' }),
    respond.toolCall('transfer_to_tech', { reason: 'b' }),
    respond.toolCall('transfer_to_billing', { reason: 'c' }),
  );
  const limited = await mod.runSwarm(QUESTION, options({ maxHandoffs: 2 }));
  expect([limited.status, limited.agent, limited.answer, limited.turns]).toEqual(['handoff_limit', 'tech', null, 3]);
  expect(limited.path).toEqual(['triage', 'billing', 'tech']);

  fakeModel.reset().handle(() => respond.unknownTool('transfer_to_nowhere'));
  const stuck = await mod.runSwarm(QUESTION, options({ maxTurns: 3 }));
  expect([stuck.status, stuck.agent, stuck.answer, stuck.turns]).toEqual(['turn_limit', 'triage', null, 3]);
  expect(fakeModel.requests).toHaveLength(3);
});

test('keeps its invariants for every mix of answers, handoffs and invalid calls', async () => {
  await forEachSeed(25, async () => {
    fakeModel.handle(() =>
      respond.oneOf([
        respond.text('Resolved.'),
        respond.toolCall('transfer_to_billing', { reason: 'billing' }),
        respond.toolCall('transfer_to_tech', { reason: 'tech' }),
        respond.toolCall('transfer_to_refunds', { reason: 'refunds' }),
        respond.unknownTool(),
      ]),
    );
    const result = await mod.runSwarm(QUESTION, options({ maxHandoffs: 3, maxTurns: 6 }));
    expect(['answered', 'handoff_limit', 'ping_pong', 'turn_limit']).toContain(result.status);
    expect(result.turns).toBe(fakeModel.requests.length);
    expect(result.turns).toBeLessThanOrEqual(6);
    expect(result.handoffs.length).toBeLessThanOrEqual(3);
    expect(result.path).toEqual(['triage', ...result.handoffs.map((handoff: { to: string }) => handoff.to)]);
    expect(result.agent).toBe(result.path[result.path.length - 1]);
    result.handoffs.forEach((handoff: { from: string; to: string }) => expect(AGENTS[handoff.from].handoffs).toContain(handoff.to));
    for (let end = 4; end <= result.path.length; end++) expect(mod.isPingPong(result.path.slice(0, end))).toBe(false);
    expect(result.answer === null).toBe(result.status !== 'answered');
    fakeModel.requests.forEach((request: Request, index: number) => {
      const agent = AGENTS[agentOf(request)];
      expect(request.tools.map((tool: { name: string }) => tool.name)).toEqual(agent.handoffs.map(mod.handoffToolName));
      expect(request.messages.filter((message) => message.role === 'system')).toHaveLength(1);
      expect(index === 0 || request.messages.length > fakeModel.requests[index - 1].messages.length).toBe(true);
    });
  });
});
