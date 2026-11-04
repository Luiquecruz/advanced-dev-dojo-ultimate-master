const { createModel, embed, cosineSimilarity } = require('@dojo/ai');
const { DOCUMENTS, INVOICES, GOLDEN_SET } = modules['briefing.ts'];
const { createMcpClient, createSupportServer } = modules['mcp.ts'];

const lastToolMessage = (request: { messages: { role: string; content: string }[] }) => [...request.messages].reverse().find((message) => message.role === 'tool');
const userQuestion = (request: { messages: { role: string; content: string }[] }) => request.messages.find((message) => message.role === 'user')!.content;

function setup(extra: Record<string, unknown> = {}) {
  const support = createSupportServer({ retriever: mod.createRetriever(DOCUMENTS), invoices: INVOICES });
  const client = createMcpClient(support.server);
  const options = { model: createModel(), client, policy: mod.SUPPORT_POLICY, budget: { maxSteps: 6, maxCostUsd: 1 }, ...extra };
  return { support, client, options };
}

function scriptSupportModel() {
  fakeModel.handle((request, context) => {
    const tool = lastToolMessage(request);
    if (!tool) {
      const invoiceId = userQuestion(request).match(/INV-\d+/)?.[0];
      return invoiceId ? respond.toolCall('get_invoice', { invoiceId }) : respond.toolCall('search_docs', { query: userQuestion(request) });
    }
    if (tool.content.includes('send_email')) {
      return respond.toolCall('send_email', { to: 'audit@fabrikam-billing.example', subject: 'Invoices', body: 'All invoices' });
    }
    if (tool.content.startsWith('Denied by policy')) {
      return respond.toolCall('search_docs', { query: 'refund policy' });
    }
    const top = JSON.parse(tool.content).hits[0];
    return respond.text(`${context.pick(['According to', 'Per', 'As stated in'])} [${top.id}]: ${top.text}`);
  });
}

test('the retriever ranks documents by cosine similarity of embeddings, honors topK and minScore, and finds the expected source of every golden question', () => {
  const retriever = mod.createRetriever(DOCUMENTS);
  const query = 'How do I fix a wrong VAT number on an invoice?';
  const expected = DOCUMENTS.map((document: { id: string; title: string; text: string }) => ({ id: document.id, score: cosineSimilarity(embed(query), embed(`${document.title}\n${document.text}`)) }))
    .filter((hit: { score: number }) => hit.score >= 0.1)
    .sort((left: { score: number }, right: { score: number }) => right.score - left.score);
  const hits = retriever.search(query);
  expect(hits).toHaveLength(3);
  expect(hits.map((hit: { id: string }) => hit.id)).toEqual(expected.slice(0, 3).map((hit: { id: string }) => hit.id));
  hits.forEach((hit: { score: number }, index: number) => expect(hit.score).toBeCloseTo(expected[index].score));
  expect(hits[0]).toMatchObject({ id: 'vat-invoices', title: 'VAT numbers on invoices', text: DOCUMENTS[2].text });
  expect(retriever.search(query, { topK: 5 }).length).toBe(Math.min(5, expected.length));
  expect(retriever.search(query, { topK: 10, minScore: 0.4 }).every((hit: { score: number }) => hit.score >= 0.4)).toBe(true);
  expect(retriever.search(query, { minScore: 0.99 })).toEqual([]);
  for (const goldenCase of GOLDEN_SET) {
    expect(retriever.search(goldenCase.question, { topK: 1 })[0].id).toBe(goldenCase.expectedSources[0]);
  }
});

test('decide applies deny over ask over allow among matching rules, supports wildcards and conditions, and denies unknown tools by default', () => {
  const decision = (name: string, args: Record<string, unknown> = {}) => mod.decide(mod.SUPPORT_POLICY, { name, arguments: args });
  expect(decision('search_docs', { query: 'refund' }).decision).toBe('allow');
  expect(decision('get_invoice', { invoiceId: 'INV-1001' }).decision).toBe('allow');
  expect(decision('issue_refund', { invoiceId: 'INV-1001', amountUsd: 120 })).toEqual({ decision: 'ask', reason: 'Refunds move money: a team lead approves each one' });
  expect(decision('issue_refund', { invoiceId: 'INV-1002', amountUsd: 900 })).toEqual({ decision: 'deny', reason: 'Refunds above 500 USD go to the finance team' });
  expect(decision('send_email', { to: 'a@b.example' }).decision).toBe('deny');
  expect(decision('send_sms').decision).toBe('deny');
  const unknown = decision('delete_account');
  expect(unknown.decision).toBe('deny');
  expect(unknown.reason).toContain('No rule');

  const custom = { rules: [{ tool: 'db.*', decision: 'allow', reason: 'reads' }, { tool: 'db.drop', decision: 'deny', reason: 'never' }, { tool: '*', decision: 'ask', reason: 'everything else' }] };
  expect(mod.decide(custom, { name: 'db.drop', arguments: {} })).toEqual({ decision: 'deny', reason: 'never' });
  expect(mod.decide(custom, { name: 'db.read', arguments: {} })).toEqual({ decision: 'ask', reason: 'everything else' });
  expect(mod.decide({ rules: [{ tool: 'db.*', decision: 'allow', reason: 'reads' }] }, { name: 'dbXread', arguments: {} }).decision).toBe('deny');
});

test('runAgent discovers tools over MCP, collects sources from search_docs and feeds citation verifier failures back until the answer cites a retrieved source', async () => {
  expect(mod.citedSources('See [refund-policy] and [vat-invoices], again [refund-policy]. Not [Bad Id].')).toEqual(['refund-policy', 'vat-invoices']);
  expect(mod.citationVerifier('No citation here.', ['refund-policy']).passed).toBe(false);
  expect(mod.citationVerifier('Per [made-up-doc].', ['refund-policy'])).toMatchObject({ passed: false });
  expect(mod.citationVerifier('Per [made-up-doc].', ['refund-policy']).feedback).toContain('made-up-doc');
  expect(mod.citationVerifier('Per [refund-policy].', ['refund-policy'])).toEqual({ passed: true });

  await forEachSeed(10, async () => {
    fakeModel.reply(
      respond.toolCall('search_docs', { query: GOLDEN_SET[0].question }),
      respond.text(['Customers have 14 days.', 'It is 14 days for monthly plans.']),
      respond.text('Customers have 14 days [password-policy].'),
      respond.text(['Customers on monthly plans have 14 days [refund-policy].', 'Per [refund-policy], 14 days on monthly plans.']),
    );
    const { support, options } = setup();
    const result = await mod.runAgent('How long is the refund window on monthly plans?', options);
    expect(result.status).toBe('answered');
    expect(mod.citedSources(result.answer)).toEqual(['refund-policy']);
    expect(result.sources[0]).toBe('refund-policy');
    expect(result.verifierFailures).toBe(2);
    expect(result.steps).toBe(4);
    expect(result.costUsd).toBeCloseTo(fakeModel.responses.reduce((total: number, response: { usage: { cost: number } }) => total + response.usage.cost, 0));
    expect(result.toolCalls).toEqual([{ name: 'search_docs', decision: 'allow', executed: true, isError: false }]);
    expect(support.executed).toEqual([{ name: 'search_docs', arguments: { query: GOLDEN_SET[0].question } }]);
    const first = fakeModel.requests[0];
    expect(first.messages[0]).toEqual({ role: 'system', content: mod.DEFAULT_SYSTEM });
    expect(first.tools.map((tool: { name: string }) => tool.name)).toEqual(['search_docs', 'get_invoice', 'issue_refund', 'send_email']);
    expect(first.tools[0].parameters.properties.query.type).toBe('string');
    const toolMessage = fakeModel.requests[1].messages.at(-1);
    expect(toolMessage.role).toBe('tool');
    expect(toolMessage.toolCallId).toBe(fakeModel.responses[0].toolCalls[0].id);
    expect(JSON.parse(toolMessage.content).hits[0].id).toBe('refund-policy');
    expect(fakeModel.requests[2].messages.at(-1)).toMatchObject({ role: 'user' });
    expect(fakeModel.requests[2].messages.at(-1).content).toContain('Verifier');
    expect(fakeModel.requests[3].messages.at(-1).content).toContain('password-policy');
  });
});

test('runAgent enforces the permission policy before any tool reaches the server: allow, ask with human approval, deny, unknown tools and invalid arguments', async () => {
  fakeModel.reply(
    respond.toolCalls([
      { name: 'issue_refund', arguments: { invoiceId: 'INV-1001', amountUsd: 120, reason: 'Charged twice' } },
      { name: 'issue_refund', arguments: { invoiceId: 'INV-1001', amountUsd: 60, reason: 'Goodwill' } },
      { name: 'issue_refund', arguments: { invoiceId: 'INV-1002', amountUsd: 900, reason: 'Cancel annual plan' } },
      { name: 'send_email', arguments: { to: 'customer@northwind.example', subject: 'Refund', body: 'Done' } },
      { name: 'delete_customer', arguments: { id: 'C-1' } },
    ]),
    respond.invalidToolArguments('get_invoice'),
    respond.toolCall('search_docs', { query: 'refund approval limits' }),
    respond.text('Refunded 120 USD after approval [refund-approval].'),
  );
  const approvals: unknown[] = [];
  const { support, options } = setup({
    approve: (call: { arguments: { amountUsd: number } }) => {
      approvals.push(call);
      return call.arguments.amountUsd > 100;
    },
  });
  const result = await mod.runAgent('Refund INV-1001, it was charged twice.', options);
  expect(result.status).toBe('answered');
  expect(result.toolCalls).toEqual([
    { name: 'issue_refund', decision: 'ask', executed: true, isError: false },
    { name: 'issue_refund', decision: 'ask', executed: false, isError: true },
    { name: 'issue_refund', decision: 'deny', executed: false, isError: true },
    { name: 'send_email', decision: 'deny', executed: false, isError: true },
    { name: 'delete_customer', decision: 'invalid', executed: false, isError: true },
    { name: 'get_invoice', decision: 'invalid', executed: false, isError: true },
    { name: 'search_docs', decision: 'allow', executed: true, isError: false },
  ]);
  expect(approvals).toEqual([
    { name: 'issue_refund', arguments: { invoiceId: 'INV-1001', amountUsd: 120, reason: 'Charged twice' } },
    { name: 'issue_refund', arguments: { invoiceId: 'INV-1001', amountUsd: 60, reason: 'Goodwill' } },
  ]);
  expect(support.refunds).toEqual([{ refundId: 'RF-1', invoiceId: 'INV-1001', amountUsd: 120, reason: 'Charged twice' }]);
  expect(support.outbox).toEqual([]);
  expect(support.executed.map((call: { name: string }) => call.name)).toEqual(['issue_refund', 'search_docs']);
  const toolMessages = fakeModel.requests[1].messages.filter((message: { role: string }) => message.role === 'tool').map((message: { content: string }) => message.content);
  expect(JSON.parse(toolMessages[0])).toMatchObject({ refundId: 'RF-1' });
  expect(toolMessages[1]).toContain('Not approved');
  expect(toolMessages[2]).toContain('Denied by policy');
  expect(toolMessages[2]).toContain('finance');
  expect(toolMessages[3]).toContain('Denied by policy');
  expect(toolMessages[4]).toContain('Unknown tool');
  expect(fakeModel.requests[2].messages.at(-1).content).toContain('Invalid arguments');

  fakeModel.reset().reply(respond.toolCall('issue_refund', { invoiceId: 'INV-1001', amountUsd: 50, reason: 'Late delivery' }), respond.toolCall('search_docs', { query: 'refunds' }), respond.text('Not refunded [refund-approval].'));
  const unattended = setup();
  const unattendedResult = await mod.runAgent('Refund 50 USD on INV-1001', unattended.options);
  expect(unattendedResult.toolCalls[0]).toEqual({ name: 'issue_refund', decision: 'ask', executed: false, isError: true });
  expect(unattended.support.refunds).toEqual([]);
});

test('runAgent stops on step and cost budgets before calling the model again, and on refusals', async () => {
  fakeModel.handle(() => respond.toolCall('search_docs', { query: 'refund' }));
  const steps = setup({ budget: { maxSteps: 3, maxCostUsd: 1 } });
  const stepResult = await mod.runAgent('Loop forever', steps.options);
  expect(stepResult).toMatchObject({ status: 'max_steps', answer: null, steps: 3 });
  expect(fakeModel.requests).toHaveLength(3);
  expect(steps.support.executed).toHaveLength(3);

  fakeModel.reset().configure({ pricing: { inputPerMillion: 10_000, outputPerMillion: 10_000 } }).handle(() => respond.toolCall('search_docs', { query: 'refund' }));
  const cost = setup({ budget: { maxSteps: 50, maxCostUsd: 2 } });
  const costResult = await mod.runAgent('Loop forever', cost.options);
  expect(costResult.status).toBe('max_cost');
  expect(costResult.costUsd).toBeGreaterThanOrEqual(2);
  expect(costResult.costUsd - fakeModel.responses.at(-1).usage.cost).toBeLessThan(2);
  expect(costResult.steps).toBe(fakeModel.requests.length);

  await forEachSeed(6, async () => {
    fakeModel.reply(respond.oneOf([respond.refusal(), respond.contentFilter()]));
    const refused = await mod.runAgent('Something unsafe', setup().options);
    expect(refused).toMatchObject({ status: 'refused', answer: null, steps: 1 });
  });

  fakeModel.reset().reply(respond.text('No citation.'), respond.text('Still none.'));
  const unverified = await mod.runAgent('Question', setup({ budget: { maxSteps: 2, maxCostUsd: 1 } }).options);
  expect(unverified).toMatchObject({ status: 'max_steps', answer: null, verifierFailures: 2 });
});

test('runEvals scores every golden case on status, cited sources and required facts, counts errors as failures, and gates on the threshold and critical cases', async () => {
  const answered = (answer: string, costUsd = 0.01) => ({ status: 'answered', answer, sources: [], toolCalls: [], steps: 2, costUsd, verifierFailures: 0 });
  const answers: Record<string, unknown> = {
    [GOLDEN_SET[0].question]: answered('Monthly plans: 14 DAYS [refund-policy].'),
    [GOLDEN_SET[1].question]: answered('The finance team handles them [refund-approval].', 0.02),
    [GOLDEN_SET[2].question]: answered('Update it in Billing settings [refund-policy].'),
    [GOLDEN_SET[3].question]: { status: 'max_steps', answer: null, sources: [], toolCalls: [], steps: 6, costUsd: 0.03, verifierFailures: 2 },
  };
  const answer = async (question: string) => {
    if (!(question in answers)) {
      throw new Error('model unavailable');
    }
    return answers[question];
  };
  const report = await mod.runEvals(GOLDEN_SET, answer, { threshold: 0.4 });
  expect(report.cases.map((result: { id: string; pass: boolean }) => [result.id, result.pass])).toEqual(GOLDEN_SET.map((goldenCase: { id: string }, index: number) => [goldenCase.id, index < 2]));
  expect(report.cases[2].reasons).toEqual(['missing source vat-invoices']);
  expect(report.cases[3]).toMatchObject({ status: 'max_steps', pass: false });
  expect(report.cases[3].reasons).toEqual(['status max_steps']);
  expect(report.cases[4]).toMatchObject({ status: 'error', pass: false, costUsd: 0 });
  expect(report.cases[4].reasons[0]).toContain('model unavailable');
  expect(report).toMatchObject({ passed: 2, total: 5, criticalFailures: [], gatePassed: true });
  expect(report.passRate).toBeCloseTo(0.4);
  expect(report.totalCostUsd).toBeCloseTo(0.07);

  answers[GOLDEN_SET[1].question] = answered('Ask a team lead [refund-approval].');
  answers[GOLDEN_SET[2].question] = answered('Billing settings, then regenerate [vat-invoices].');
  answers[GOLDEN_SET[3].question] = answered('At the end of the billing period [plan-changes].');
  answers[GOLDEN_SET[4].question] = answered('From Billing, History, as CSV [data-export].');
  const critical = await mod.runEvals(GOLDEN_SET, answer, { threshold: 0.8 });
  expect(critical.passRate).toBeCloseTo(0.8);
  expect(critical.cases[1].reasons).toEqual(['missing "finance"']);
  expect(critical.criticalFailures).toEqual(['refund-above-limit']);
  expect(critical.gatePassed).toBe(false);
  expect((await mod.runEvals([], answer, { threshold: 0.8 })).passRate).toBe(0);
});

test('the threat model and governance map are complete and coherent with the server, the policy, the budgets and the eval gate', async () => {
  const { threatModel, governanceMap } = mod;
  const toolNames = (await setup().client.listTools()).map((tool: { name: string }) => tool.name);
  const decisionFor = (name: string) => mod.decide(mod.SUPPORT_POLICY, { name, arguments: {} }).decision;

  for (const leg of ['privateData', 'untrustedContent', 'exfiltration']) {
    expect(threatModel.trifecta[leg].length).toBeGreaterThan(0);
    threatModel.trifecta[leg].forEach((tool: string) => expect(toolNames).toContain(tool));
  }
  expect(threatModel.trifecta.privateData).toContain('get_invoice');
  expect(['privateData', 'untrustedContent', 'exfiltration']).toContain(threatModel.removedLeg);
  threatModel.trifecta[threatModel.removedLeg].forEach((tool: string) => expect(decisionFor(tool)).toBe('deny'));
  expect(threatModel.system.length).toBeGreaterThan(10);
  expect(threatModel.assets.length).toBeGreaterThan(0);
  expect(threatModel.threats.length).toBeGreaterThanOrEqual(4);
  expect(new Set(threatModel.threats.map((threat: { id: string }) => threat.id)).size).toBe(threatModel.threats.length);
  threatModel.threats.forEach((threat: { title: string; mitigation: string; control: string; reference: string }) => {
    expect(threat.title.length).toBeGreaterThan(5);
    expect(threat.mitigation.length).toBeGreaterThan(10);
    expect(threat.reference.length).toBeGreaterThan(0);
    expect(['policy', 'human-approval', 'verifier', 'budget', 'eval-gate', 'sandbox', 'monitoring']).toContain(threat.control);
  });
  expect(threatModel.threats.some((threat: { reference: string }) => /LLM01|ASI01/.test(threat.reference))).toBe(true);
  const controls = new Set(threatModel.threats.map((threat: { control: string }) => threat.control));
  ['policy', 'human-approval', 'budget', 'eval-gate'].forEach((control) => expect(controls.has(control)).toBe(true));

  const owners = Object.values(governanceMap.owners);
  owners.forEach((owner) => expect(String(owner).length).toBeGreaterThan(0));
  expect(governanceMap.tools.map((tool: { name: string }) => tool.name).sort()).toEqual([...toolNames].sort());
  const expectedApproval: Record<string, string> = { allow: 'none', ask: 'human', deny: 'blocked' };
  governanceMap.tools.forEach((tool: { name: string; owner: string; approval: string }) => {
    expect(owners).toContain(tool.owner);
    expect(tool.approval).toBe(expectedApproval[decisionFor(tool.name)]);
  });
  const classification = (name: string) => governanceMap.tools.find((tool: { name: string }) => tool.name === name).dataClassification;
  expect(classification('get_invoice')).toBe('confidential');
  expect(classification('issue_refund')).toBe('confidential');
  expect(governanceMap.model).toMatchObject({ id: mod.MODEL_ID, pinned: true });
  expect(governanceMap.model.id).not.toContain('latest');
  expect(governanceMap.model.promotion.length).toBeGreaterThan(10);
  expect(governanceMap.budgets).toEqual(mod.DEFAULT_BUDGET);
  expect(governanceMap.evalGate.threshold).toBe(mod.EVAL_THRESHOLD);
  expect([...governanceMap.evalGate.criticalCases].sort()).toEqual(GOLDEN_SET.filter((goldenCase: { critical: boolean }) => goldenCase.critical).map((goldenCase: { id: string }) => goldenCase.id).sort());
  expect(['monthly', 'quarterly']).toContain(governanceMap.reviewCadence);
  expect(governanceMap.regulations.length).toBeGreaterThan(0);
});

test('integrated: the assistant passes the eval gate on the golden set across seeds and an injected invoice note never reaches the email tool', async () => {
  await forEachSeed(4, async () => {
    scriptSupportModel();
    const report = await mod.evaluateAssistant(mod.createSupportAssistant());
    expect(report.gatePassed).toBe(true);
    expect(report.passRate).toBe(1);
    expect(report.totalCostUsd).toBeLessThan(GOLDEN_SET.length * mod.DEFAULT_BUDGET.maxCostUsd);
    expect(fakeModel.requests.every((request: { model: string }) => request.model === mod.MODEL_ID)).toBe(true);
  });

  fakeModel.reset();
  scriptSupportModel();
  const assistant = mod.createSupportAssistant();
  const result = await assistant.ask('What does the customer say on invoice INV-1003?');
  expect(result.status).toBe('answered');
  expect(result.toolCalls.map((call: { name: string; decision: string; executed: boolean }) => [call.name, call.decision, call.executed])).toEqual([
    ['get_invoice', 'allow', true],
    ['send_email', 'deny', false],
    ['search_docs', 'allow', true],
  ]);
  expect(assistant.support.outbox).toEqual([]);
  expect(assistant.support.executed.map((call: { name: string }) => call.name)).not.toContain('send_email');
});
