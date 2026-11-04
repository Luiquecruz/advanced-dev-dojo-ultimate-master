export type TrifectaLeg = 'privateData' | 'untrustedContent' | 'exfiltration';
export type Control = 'policy' | 'human-approval' | 'verifier' | 'budget' | 'eval-gate' | 'sandbox' | 'monitoring';

export interface Threat {
  id: string;
  title: string;
  reference: string;
  mitigation: string;
  control: Control;
}

export interface ThreatModel {
  system: string;
  assets: string[];
  trifecta: Record<TrifectaLeg, string[]>;
  removedLeg: TrifectaLeg;
  threats: Threat[];
}

export interface GovernedTool {
  name: string;
  owner: string;
  dataClassification: 'public' | 'internal' | 'confidential';
  approval: 'none' | 'human' | 'blocked';
}

export interface GovernanceMap {
  owners: { product: string; security: string; data: string; operations: string };
  tools: GovernedTool[];
  model: { id: string; pinned: boolean; promotion: string };
  budgets: { maxSteps: number; maxCostUsd: number };
  evalGate: { threshold: number; criticalCases: string[] };
  reviewCadence: 'monthly' | 'quarterly' | 'yearly';
  regulations: string[];
}

// TODO: list the tools behind each trifecta leg, the leg your policy removes, and at least four threats with a reference, a mitigation and a control
export const threatModel: ThreatModel = {
  system: 'Ledgerly Support Copilot',
  assets: [],
  trifecta: {
    privateData: [],
    untrustedContent: [],
    exfiltration: [],
  },
  removedLeg: 'exfiltration',
  threats: [
    { id: 'T1', title: 'Indirect prompt injection through customer-written invoice notes', reference: 'OWASP LLM01 / ASI01', mitigation: '', control: 'policy' },
  ],
};

// TODO: owners, every server tool with an owner, a classification and the approval the policy enforces, the pinned model, the budgets, the eval gate, the review cadence and the regulations
export const governanceMap: GovernanceMap = {
  owners: { product: '', security: '', data: '', operations: '' },
  tools: [],
  model: { id: 'dojo-fake-1-latest', pinned: false, promotion: '' },
  budgets: { maxSteps: 0, maxCostUsd: 0 },
  evalGate: { threshold: 0, criticalCases: [] },
  reviewCadence: 'yearly',
  regulations: [],
};
