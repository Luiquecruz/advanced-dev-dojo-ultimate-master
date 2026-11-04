export type Decision = 'allow' | 'ask' | 'deny';

export interface PolicyRule {
  tool: string;
  decision: Decision;
  reason: string;
  when?: (args: Record<string, unknown>) => boolean;
}

export interface Policy {
  rules: PolicyRule[];
}

export interface ToolCallRequest {
  name: string;
  arguments: Record<string, unknown>;
}

export interface PolicyDecision {
  decision: Decision;
  reason: string;
}

export const SUPPORT_POLICY: Policy = {
  rules: [
    { tool: 'search_docs', decision: 'allow', reason: 'Read-only search of the help center' },
    { tool: 'get_invoice', decision: 'allow', reason: 'Read-only invoice lookup for support agents' },
    { tool: 'issue_refund', decision: 'ask', reason: 'Refunds move money: a team lead approves each one' },
    { tool: 'issue_refund', decision: 'deny', reason: 'Refunds above 500 USD go to the finance team', when: (args) => typeof args.amountUsd === 'number' && args.amountUsd > 500 },
    { tool: 'send_*', decision: 'deny', reason: 'The copilot never sends messages: no exfiltration channel' },
  ],
};

const PRECEDENCE: Decision[] = ['deny', 'ask', 'allow'];

function matchesTool(pattern: string, name: string): boolean {
  const source = pattern
    .split('*')
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*');
  return new RegExp(`^${source}$`).test(name);
}

export function decide(policy: Policy, call: ToolCallRequest): PolicyDecision {
  const matching = policy.rules.filter((rule) => matchesTool(rule.tool, call.name) && (rule.when === undefined || rule.when(call.arguments)));
  for (const decision of PRECEDENCE) {
    const rule = matching.find((candidate) => candidate.decision === decision);
    if (rule) {
      return { decision, reason: rule.reason };
    }
  }
  return { decision: 'deny', reason: `No rule matches ${call.name}: denied by default` };
}
