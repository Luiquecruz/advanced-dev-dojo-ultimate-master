export const adr = {
  id: 1,
  title: 'Run Relay as a draft-only support agent with approved refunds',
  status: 'accepted',
  layer: 'governance',
  context:
    'Relay resolves about 3 000 support tickets a day. Tickets are written by anyone who can email us, so every ticket is untrusted content that may carry a prompt injection, while Relay must read customer profiles and orders, which are personal data under the LGPD and GDPR. The console renders markdown with remote images, Relay could send email and fetch any URL, refunds up to $200 must stay possible with a human approval, the help center tools come from a third-party MCP server, and audit logs are shipped to an external vendor.',
  decision:
    'We will remove the external communication leg: Relay saves drafts that a human sends, cannot fetch URLs, and its answers render without remote images; refunds require approval, credentials are scoped per ticket, and the DeskDocs tools are pinned by hash.',
  alternatives: [
    {
      option: 'Keep send_email behind a human approval',
      reason: 'Approval does not remove the leg: agents approve dozens of replies an hour, and data hidden in a long body would still leave.',
    },
    {
      option: 'Rely on an input classifier to stop injected tickets',
      reason: 'Classifiers are probabilistic and adaptive attacks bypass them, so the exfiltration path would stay open for every miss.',
    },
    {
      option: 'Remove customer lookup instead',
      reason: 'Without order data Relay cannot resolve most tickets, which removes the reason the product exists.',
    },
  ],
  consequences: {
    positive: [
      'An injected ticket can no longer send customer data anywhere: no session holds all three legs of the trifecta.',
      'A leaked credential is limited to one ticket and expires within minutes.',
      'A silent change to the help center tools is withheld until someone reviews the diff.',
    ],
    negative: [
      'Every reply needs a human click, so resolution time grows and support leads must staff the review queue.',
      'Customers who paste links get no automatic page summaries.',
      'Refund approvals can become routine; approval rates must be audited to keep the check real.',
    ],
  },
};

export const threatModel = {
  assets: [
    'Customer profiles and order history (personal data)',
    'Payment refunds and the refund credential',
    'Credentials for the CRM, help desk and payments APIs',
    'The integrity of replies sent to customers',
  ],
  trustBoundaries: [
    'Inbound ticket content (untrusted) to the agent context',
    'Agent tool calls to the CRM, payments and help desk APIs',
    'Third-party DeskDocs MCP server to the agent context',
    'Rendered answers in the support console browser',
    'Audit logs leaving for the external log vendor',
  ],
  tools: {
    read_ticket: 'enabled',
    lookup_customer: 'enabled',
    search_help_center: 'enabled',
    fetch_url: 'removed',
    send_email: 'removed',
    draft_reply: 'enabled',
    issue_refund: 'approval',
  },
  rendersRemoteImages: false,
  removedLeg: 'externalCommunication',
  credentials: ['crm-read:per-ticket', 'kb-read', 'helpdesk-write:per-ticket', 'payments-refund:per-request'],
  threats: [
    {
      id: 'T1',
      concern: 'C1',
      owasp: ['LLM01', 'ASI01', 'LLM02'],
      threat: 'An injected ticket makes Relay send order history to the attacker by email, URL or markdown image.',
      mitigations: ['draft-only-replies', 'no-url-fetching', 'no-remote-images', 'red-team-gate'],
    },
    {
      id: 'T2',
      concern: 'C2',
      owasp: ['ASI02', 'LLM03'],
      threat: 'An injected ticket convinces Relay to issue refunds the customer is not owed.',
      mitigations: ['refund-approval', 'refund-limits', 'scoped-short-lived-credentials'],
    },
    {
      id: 'T3',
      concern: 'C3',
      owasp: ['ASI04', 'LLM04'],
      threat: 'The DeskDocs MCP server changes a tool description after review to steer other tools.',
      mitigations: ['server-allowlist', 'pinned-tool-hashes'],
    },
    {
      id: 'T4',
      concern: 'C4',
      owasp: ['LLM02', 'ASI03'],
      threat: 'Customer personal data or API tokens end up in the audit logs shipped to the vendor.',
      mitigations: ['secrets-out-of-context', 'pii-redaction-in-logs', 'scoped-short-lived-credentials'],
    },
  ],
  residualRisks: [
    {
      risk: 'An injected ticket can still bias a draft, and a hurried agent may send it unchanged.',
      acceptedBecause: 'A human reads every draft before sending and the red-team suite tracks goal hijack in every release.',
    },
    {
      risk: 'Approvers may rubber-stamp refunds under load.',
      acceptedBecause: 'Refunds are capped at $200 per request and finance audits approval rates monthly.',
    },
  ],
  redTeam: {
    categories: ['exfiltration', 'tool_misuse', 'goal_hijack', 'prompt_leak'],
    maxRateByCategory: { exfiltration: 0, tool_misuse: 0 },
    maxOverallRate: 0.05,
  },
};
