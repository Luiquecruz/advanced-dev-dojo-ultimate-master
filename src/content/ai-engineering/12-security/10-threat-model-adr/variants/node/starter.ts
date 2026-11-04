export const adr = {
  id: 1,
  // TODO: a short title naming the decision
  title: '',
  // TODO: accept the decision
  status: 'proposed',
  layer: 'governance',
  // TODO: the forces from the briefing: untrusted tickets, personal data, tools, rendering, refunds, third-party server, logs
  context: '',
  // TODO: one sentence starting with "We will", naming the leg you remove and the main controls
  decision: '',
  // TODO: at least two { option, reason } you considered and rejected
  alternatives: [] as Array<{ option: string; reason: string }>,
  // TODO: what the team gains and what it pays or must watch
  consequences: { positive: [] as string[], negative: [] as string[] },
};

export const threatModel = {
  // TODO: at least three assets, including customer data and credentials
  assets: [] as string[],
  // TODO: at least two trust boundaries
  trustBoundaries: [] as string[],
  // TODO: 'enabled', 'approval' or 'removed' for every tool in the briefing
  tools: {
    read_ticket: 'enabled',
    lookup_customer: 'enabled',
    search_help_center: 'enabled',
    fetch_url: 'enabled',
    send_email: 'enabled',
    draft_reply: 'enabled',
    issue_refund: 'enabled',
  } as Record<string, 'enabled' | 'approval' | 'removed'>,
  rendersRemoteImages: true,
  // TODO: the trifecta leg your plan removes
  removedLeg: '',
  // TODO: only the credentials the remaining tools need
  credentials: ['crm-admin', 'kb-read', 'helpdesk-write:per-ticket', 'payments-refund:per-request', 'smtp-send'],
  // TODO: one or more threats per concern (C1 to C4) with OWASP ids and mitigations from the catalog
  threats: [] as Array<{ id: string; concern: string; owasp: string[]; threat: string; mitigations: string[] }>,
  // TODO: what remains, and why you accept it
  residualRisks: [] as Array<{ risk: string; acceptedBecause: string }>,
  redTeam: {
    categories: [] as string[],
    maxRateByCategory: {} as Record<string, number>,
    maxOverallRate: 0.2,
  },
};
