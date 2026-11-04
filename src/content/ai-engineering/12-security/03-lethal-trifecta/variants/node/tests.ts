const TOOLS = [
  { name: 'read_inbox', capabilities: ['privateData', 'untrustedContent'] },
  { name: 'search_drive', capabilities: ['privateData'] },
  { name: 'fetch_url', capabilities: ['untrustedContent', 'externalCommunication'] },
  { name: 'send_email', capabilities: ['externalCommunication'] },
  { name: 'draft_reply', capabilities: [] },
  { name: 'calculator', capabilities: [] },
  { name: 'legacy_plugin' },
];

function emailAgent(sessions: unknown[]) {
  return { name: 'mail-assistant', tools: TOOLS, sessions };
}

test('analyzeSession lists the tools behind each leg in session order and flags a session that has all three', () => {
  const report = mod.analyzeSession({ id: 'triage', tools: ['read_inbox', 'search_drive', 'send_email', 'calculator'] }, TOOLS);
  expect(report).toEqual({
    sessionId: 'triage',
    legs: { privateData: ['read_inbox', 'search_drive'], untrustedContent: ['read_inbox'], externalCommunication: ['send_email'] },
    lethal: true,
  });
  const safe = mod.analyzeSession({ id: 'drafts', tools: ['read_inbox', 'search_drive', 'draft_reply'] }, TOOLS);
  expect(safe.lethal).toBe(false);
  expect(safe.legs.externalCommunication).toEqual([]);
});

test('untrusted session inputs and remote image rendering count as legs even without any tool', () => {
  const report = mod.analyzeSession({ id: 'inbound', tools: ['search_drive'], untrustedInputs: ['inbound email', 'attachment'], rendersRemoteImages: true }, TOOLS);
  expect(report.legs.untrustedContent).toEqual(['input:inbound email', 'input:attachment']);
  expect(report.legs.externalCommunication).toEqual(['remote-images']);
  expect(report.lethal).toBe(true);
  const plainText = mod.analyzeSession({ id: 'inbound', tools: ['search_drive'], untrustedInputs: ['inbound email'], rendersRemoteImages: false }, TOOLS);
  expect(plainText.lethal).toBe(false);
});

test('a tool without capability labels, or one missing from the profiles, counts as every leg; an empty label list counts as none', () => {
  const unlabeled = mod.analyzeSession({ id: 'plugin', tools: ['legacy_plugin'] }, TOOLS);
  expect(unlabeled.legs).toEqual({ privateData: ['legacy_plugin'], untrustedContent: ['legacy_plugin'], externalCommunication: ['legacy_plugin'] });
  expect(unlabeled.lethal).toBe(true);
  const unknown = mod.analyzeSession({ id: 'mystery', tools: ['shadow_tool'] }, TOOLS);
  expect(unknown.lethal).toBe(true);
  const harmless = mod.analyzeSession({ id: 'math', tools: ['calculator', 'draft_reply'] }, TOOLS);
  expect(harmless.legs).toEqual({ privateData: [], untrustedContent: [], externalCommunication: [] });
  expect(harmless.lethal).toBe(false);
});

test('analyzeAgent reports every session in order and names the lethal ones', () => {
  const report = mod.analyzeAgent(
    emailAgent([
      { id: 'summarize', tools: ['read_inbox', 'draft_reply'] },
      { id: 'research', tools: ['search_drive', 'fetch_url'] },
      { id: 'notify', tools: ['send_email'] },
      { id: 'auto-reply', tools: ['read_inbox', 'send_email'] },
    ]),
  );
  expect(report.agent).toBe('mail-assistant');
  expect(report.sessions.map((session: { sessionId: string }) => session.sessionId)).toEqual(['summarize', 'research', 'notify', 'auto-reply']);
  expect(report.lethalSessions).toEqual(['research', 'auto-reply']);
});

test('suggestRemoval picks the leg with the fewest sources, prefers external communication on ties, and returns null for a safe session', () => {
  const tie = mod.analyzeSession({ id: 'a', tools: ['search_drive', 'send_email'], untrustedInputs: ['web page'] }, TOOLS);
  expect(mod.suggestRemoval(tie)).toEqual({ leg: 'externalCommunication', sources: ['send_email'] });
  const fewestUntrusted = mod.analyzeSession({ id: 'b', tools: ['search_drive', 'send_email'], untrustedInputs: ['ticket'], rendersRemoteImages: true }, TOOLS);
  expect(mod.suggestRemoval(fewestUntrusted)).toEqual({ leg: 'untrustedContent', sources: ['input:ticket'] });
  const fewestPrivate = mod.analyzeSession({ id: 'c', tools: ['search_drive', 'fetch_url', 'send_email'], untrustedInputs: ['ticket'] }, TOOLS);
  expect(mod.suggestRemoval(fewestPrivate)).toEqual({ leg: 'privateData', sources: ['search_drive'] });
  expect(mod.suggestRemoval(mod.analyzeSession({ id: 'd', tools: ['read_inbox', 'draft_reply'] }, TOOLS))).toBeNull();
});

test('removeLeg returns a new configuration where that session no longer has the leg, leaving other sessions and the input untouched', () => {
  const config = emailAgent([
    { id: 'auto-reply', tools: ['read_inbox', 'search_drive', 'send_email', 'fetch_url', 'draft_reply'], rendersRemoteImages: true },
    { id: 'research', tools: ['search_drive', 'fetch_url'] },
  ]);
  const snapshot = JSON.stringify(config);
  const fixed = mod.removeLeg(config, 'auto-reply', 'externalCommunication');
  expect(JSON.stringify(config)).toBe(snapshot);
  expect(fixed.sessions[0].tools).toEqual(['read_inbox', 'search_drive', 'draft_reply']);
  expect(fixed.sessions[0].rendersRemoteImages).toBe(false);
  expect(fixed.sessions[1].tools).toEqual(['search_drive', 'fetch_url']);
  expect(mod.analyzeAgent(fixed).lethalSessions).toEqual(['research']);

  const quarantined = mod.removeLeg(emailAgent([{ id: 'inbound', tools: ['search_drive', 'send_email', 'legacy_plugin'], untrustedInputs: ['email'] }]), 'inbound', 'untrustedContent');
  expect(quarantined.sessions[0].tools).toEqual(['search_drive', 'send_email']);
  expect(quarantined.sessions[0].untrustedInputs).toEqual([]);
  expect(mod.analyzeAgent(quarantined).lethalSessions).toEqual([]);

  expect(() => mod.removeLeg(config, 'missing', 'privateData')).toThrow('missing');
});

test('the runtime guard blocks the call that would complete the trifecta, whatever the order, and does not record a denied call', () => {
  const orders = [
    { calls: ['search_drive', 'fetch_url'], legsBefore: ['privateData'] },
    { calls: ['fetch_url', 'search_drive'], legsBefore: ['untrustedContent', 'externalCommunication'] },
    { calls: ['send_email', 'draft_reply', 'read_inbox'], legsBefore: ['externalCommunication'] },
  ];
  for (const { calls, legsBefore } of orders) {
    const guard = mod.createTrifectaGuard(TOOLS);
    const decisions = calls.map((tool) => guard.authorize(tool));
    decisions.slice(0, -1).forEach((decision: { allowed: boolean }) => expect(decision.allowed).toBe(true));
    expect(decisions[decisions.length - 1]).toEqual({ allowed: false, reason: 'lethal_trifecta', legs: legsBefore });
    expect(guard.legs()).toEqual(legsBefore);
  }
  const guard = mod.createTrifectaGuard(TOOLS);
  expect(guard.authorize('search_drive')).toEqual({ allowed: true, legs: ['privateData'] });
  expect(guard.authorize('draft_reply')).toEqual({ allowed: true, legs: ['privateData'] });
  expect(guard.authorize('send_email')).toEqual({ allowed: true, legs: ['privateData', 'externalCommunication'] });
  expect(guard.authorize('fetch_url')).toEqual({ allowed: false, reason: 'lethal_trifecta', legs: ['privateData', 'externalCommunication'] });
  expect(guard.authorize('send_email').allowed).toBe(true);
  expect(guard.legs()).toEqual(['privateData', 'externalCommunication']);

  const triggeredByEmail = mod.createTrifectaGuard(TOOLS, { initialLegs: ['untrustedContent'] });
  expect(triggeredByEmail.authorize('search_drive').allowed).toBe(true);
  expect(triggeredByEmail.authorize('send_email').allowed).toBe(false);
  expect(mod.createTrifectaGuard(TOOLS).authorize('legacy_plugin').allowed).toBe(false);
});
