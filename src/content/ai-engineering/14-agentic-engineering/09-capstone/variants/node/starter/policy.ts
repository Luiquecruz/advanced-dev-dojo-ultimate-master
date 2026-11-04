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

export function decide(policy: Policy, call: ToolCallRequest): PolicyDecision {
  // TODO: among the rules whose tool pattern (with * wildcards) and condition match, deny wins over ask over allow; no match denies with a "No rule" reason
  const rule = policy.rules.find((candidate) => candidate.tool === call.name);
  return rule ? { decision: rule.decision, reason: rule.reason } : { decision: 'allow', reason: 'No rule' };
}
