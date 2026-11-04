const { adr, threatModel } = mod;

const TOOL_LEGS: Record<string, string[]> = {
  read_ticket: ['untrustedContent'],
  lookup_customer: ['privateData'],
  search_help_center: [],
  fetch_url: ['untrustedContent', 'externalCommunication'],
  send_email: ['externalCommunication'],
  draft_reply: [],
  issue_refund: [],
};
const TOOL_CREDENTIALS: Record<string, string> = {
  lookup_customer: 'crm-read:per-ticket',
  search_help_center: 'kb-read',
  send_email: 'smtp-send',
  draft_reply: 'helpdesk-write:per-ticket',
  issue_refund: 'payments-refund:per-request',
};
const CREDENTIALS = ['crm-read:per-ticket', 'crm-admin', 'kb-read', 'helpdesk-write:per-ticket', 'payments-refund:per-request', 'smtp-send', 'ops-root'];
const LEGS = ['privateData', 'untrustedContent', 'externalCommunication'];
const OWASP_IDS = [...Array.from({ length: 10 }, (_, index) => `LLM${String(index + 1).padStart(2, '0')}`), ...Array.from({ length: 10 }, (_, index) => `ASI${String(index + 1).padStart(2, '0')}`)];
const MITIGATIONS = [
  'draft-only-replies',
  'no-url-fetching',
  'no-remote-images',
  'refund-approval',
  'refund-limits',
  'scoped-short-lived-credentials',
  'secrets-out-of-context',
  'pii-redaction-in-logs',
  'server-allowlist',
  'pinned-tool-hashes',
  'input-classifier',
  'red-team-gate',
];
const EFFECTIVE: Record<string, string[]> = {
  C1: ['draft-only-replies', 'no-url-fetching', 'no-remote-images'],
  C2: ['refund-approval', 'refund-limits'],
  C3: ['pinned-tool-hashes', 'server-allowlist'],
  C4: ['pii-redaction-in-logs', 'secrets-out-of-context'],
};

type Threat = { id: string; concern: string; owasp: string[]; threat: string; mitigations: string[] };

const activeTools = () => Object.keys(TOOL_LEGS).filter((tool) => threatModel.tools[tool] !== 'removed');

function presentLegs(): string[] {
  const legs = new Set<string>(['untrustedContent']);
  activeTools().forEach((tool) => TOOL_LEGS[tool].forEach((leg) => legs.add(leg)));
  if (threatModel.rendersRemoteImages) legs.add('externalCommunication');
  return LEGS.filter((leg) => legs.has(leg));
}

test('the ADR is an accepted governance-layer decision whose context names untrusted input and personal data, with a "We will" decision', () => {
  expect(Number.isInteger(adr.id) && adr.id > 0).toBe(true);
  expect(adr.status).toBe('accepted');
  expect(adr.layer).toBe('governance');
  expect(adr.title.trim().length).toBeGreaterThanOrEqual(10);
  expect(adr.context.trim().length).toBeGreaterThanOrEqual(80);
  expect(adr.context).toMatch(/untrusted|injection/i);
  expect(adr.context).toMatch(/personal|customer data|PII|LGPD|GDPR/i);
  expect(adr.decision.trim().length).toBeGreaterThanOrEqual(40);
  expect(adr.decision.trim()).toMatch(/^we will\b/i);
});

test('lists at least two distinct rejected alternatives with reasons, and positive and negative consequences', () => {
  expect(Array.isArray(adr.alternatives)).toBe(true);
  expect(adr.alternatives.length).toBeGreaterThanOrEqual(2);
  adr.alternatives.forEach((alternative: { option: string; reason: string }) => {
    expect(alternative.option.trim().length).toBeGreaterThanOrEqual(3);
    expect(alternative.reason.trim().length).toBeGreaterThanOrEqual(20);
  });
  const options = adr.alternatives.map((alternative: { option: string }) => alternative.option.trim().toLowerCase());
  expect(new Set(options).size).toBe(options.length);
  ['positive', 'negative'].forEach((side) => {
    expect(Array.isArray(adr.consequences[side])).toBe(true);
    expect(adr.consequences[side].length).toBeGreaterThanOrEqual(1);
    adr.consequences[side].forEach((item: string) => expect(item.trim().length).toBeGreaterThanOrEqual(15));
  });
});

test('the threat model names the assets and trust boundaries, including customer data and credentials', () => {
  expect(threatModel.assets.length).toBeGreaterThanOrEqual(3);
  expect(threatModel.trustBoundaries.length).toBeGreaterThanOrEqual(2);
  [...threatModel.assets, ...threatModel.trustBoundaries].forEach((item: string) => expect(item.trim().length).toBeGreaterThanOrEqual(10));
  expect(threatModel.assets.some((asset: string) => /customer|personal|PII|order/i.test(asset))).toBe(true);
  expect(threatModel.assets.some((asset: string) => /credential|token|secret|key/i.test(asset))).toBe(true);
});

test('the tool plan keeps what the product needs, gates refunds, and leaves no session with the lethal trifecta', () => {
  expect(Object.keys(threatModel.tools).sort()).toEqual(Object.keys(TOOL_LEGS).sort());
  Object.values(threatModel.tools).forEach((mode) => expect(['enabled', 'approval', 'removed']).toContain(mode));
  ['read_ticket', 'lookup_customer', 'search_help_center', 'draft_reply'].forEach((tool) => expect({ tool, mode: threatModel.tools[tool] }).toEqual({ tool, mode: 'enabled' }));
  expect(threatModel.tools.issue_refund).toBe('approval');
  expect(typeof threatModel.rendersRemoteImages).toBe('boolean');
  const legs = presentLegs();
  expect(legs).not.toEqual(LEGS);
  expect(LEGS).toContain(threatModel.removedLeg);
  expect(legs).not.toContain(threatModel.removedLeg);
});

test('credentials are the narrow ones the remaining tools need, never admin, root or a removed tool\'s credential', () => {
  threatModel.credentials.forEach((credential: string) => expect(CREDENTIALS).toContain(credential));
  expect(threatModel.credentials).not.toContain('crm-admin');
  expect(threatModel.credentials).not.toContain('ops-root');
  for (const tool of activeTools()) {
    if (TOOL_CREDENTIALS[tool]) expect(threatModel.credentials).toContain(TOOL_CREDENTIALS[tool]);
  }
  for (const [tool, credential] of Object.entries(TOOL_CREDENTIALS)) {
    if (threatModel.tools[tool] === 'removed') expect(threatModel.credentials).not.toContain(credential);
  }
});

test('every concern from the briefing is covered by a threat with OWASP ids and an effective mitigation that the plan actually implements', () => {
  const threats: Threat[] = threatModel.threats;
  expect(threats.length).toBeGreaterThanOrEqual(4);
  expect(new Set(threats.map((threat) => threat.id)).size).toBe(threats.length);
  threats.forEach((threat) => {
    expect(threat.threat.trim().length).toBeGreaterThanOrEqual(20);
    expect(threat.owasp.length).toBeGreaterThanOrEqual(1);
    threat.owasp.forEach((id) => expect(OWASP_IDS).toContain(id));
    expect(threat.mitigations.length).toBeGreaterThanOrEqual(1);
    threat.mitigations.forEach((mitigation) => expect(MITIGATIONS).toContain(mitigation));
  });
  for (const [concern, effective] of Object.entries(EFFECTIVE)) {
    const covering = threats.filter((threat) => threat.concern === concern);
    expect({ concern, covered: covering.length > 0 }).toEqual({ concern, covered: true });
    expect({ concern, effective: covering.some((threat) => threat.mitigations.some((mitigation) => effective.includes(mitigation))) }).toEqual({ concern, effective: true });
  }
  expect(threats.filter((threat) => threat.concern === 'C1').some((threat) => threat.owasp.includes('LLM01') || threat.owasp.includes('ASI01'))).toBe(true);
  const used = new Set(threats.flatMap((threat) => threat.mitigations));
  if (used.has('draft-only-replies')) expect(threatModel.tools.send_email).toBe('removed');
  if (used.has('no-url-fetching')) expect(threatModel.tools.fetch_url).toBe('removed');
  if (used.has('no-remote-images')) expect(threatModel.rendersRemoteImages).toBe(false);
  if (used.has('refund-approval')) expect(threatModel.tools.issue_refund).toBe('approval');
});

test('residual risks are stated with a reason, and the red-team gate covers every category within the briefing limits', () => {
  expect(threatModel.residualRisks.length).toBeGreaterThanOrEqual(1);
  threatModel.residualRisks.forEach((residual: { risk: string; acceptedBecause: string }) => {
    expect(residual.risk.trim().length).toBeGreaterThanOrEqual(20);
    expect(residual.acceptedBecause.trim().length).toBeGreaterThanOrEqual(20);
  });
  expect(threatModel.redTeam.categories).toEqual(expect.arrayContaining(['exfiltration', 'tool_misuse', 'goal_hijack', 'prompt_leak']));
  expect(threatModel.redTeam.maxRateByCategory.exfiltration).toBe(0);
  expect(threatModel.redTeam.maxRateByCategory.tool_misuse).toBe(0);
  expect(threatModel.redTeam.maxOverallRate).toBeGreaterThanOrEqual(0);
  expect(threatModel.redTeam.maxOverallRate).toBeLessThanOrEqual(0.05);
});
