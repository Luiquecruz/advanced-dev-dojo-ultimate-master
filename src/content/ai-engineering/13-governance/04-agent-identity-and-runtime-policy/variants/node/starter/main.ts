import { createHash } from 'node:crypto';
import type { GenerateResponse, Message } from '@dojo/ai';

export type Classification = 'public' | 'internal' | 'confidential' | 'restricted';
export type RiskTier = 'low' | 'medium' | 'high';
export type Effect = 'allow' | 'ask' | 'deny';

export interface AgentIdentity {
  id: string;
  owner: string;
  riskTier: RiskTier;
  scopes: string[];
  purposes: string[];
  clearance: Classification;
  status: 'active' | 'suspended';
}

export interface ToolSpec {
  name: string;
  scope: string;
  classification: Classification;
  sideEffect: 'read' | 'write' | 'external';
}

export interface DecisionRequest {
  agentId: string;
  tool: string;
  purpose: string;
  onBehalfOf?: string;
}

export interface Decision extends DecisionRequest {
  effect: Effect;
  reasons: string[];
}

export interface PolicyDecisionPoint {
  decide(request: DecisionRequest): Decision;
  suspend(agentId: string): boolean;
}

export interface AuditEntry {
  sequence: number;
  timestamp: string;
  event: Record<string, unknown>;
  previousHash: string;
  hash: string;
}

export interface AuditLog {
  append(event: Record<string, unknown>): AuditEntry;
  entries(): AuditEntry[];
}

export type ChainCheck = { valid: true } | { valid: false; brokenAt: number };

export type ToolImplementation = (args: Record<string, unknown>) => string | Promise<string>;

export const GENESIS_HASH = '0'.repeat(64);

// TODO: deny unknown or suspended agents and unknown tools; collect missing-scope, purpose-not-allowed and above-clearance; ask for external side effects and high-risk writes; allow otherwise; suspend() is the kill switch
export function createPolicyDecisionPoint({ agents, tools }: { agents: AgentIdentity[]; tools: ToolSpec[] }): PolicyDecisionPoint {
  return {
    decide(request) {
      const agent = agents.find((candidate) => candidate.id === request.agentId);
      const tool = tools.find((candidate) => candidate.name === request.tool);
      if (agent && tool && agent.scopes.includes(tool.scope)) {
        return { ...request, effect: 'allow', reasons: ['within-policy'] };
      }
      return { ...request, effect: 'deny', reasons: ['missing-scope'] };
    },
    suspend(agentId) {
      throw new Error('Not implemented');
    },
  };
}

// TODO: append entries with sequence, ISO timestamp from now(), previousHash and a sha256 hash of JSON.stringify([sequence, timestamp, previousHash, event]); entries() returns copies
export function createAuditLog({ now }: { now: () => number }): AuditLog {
  const log: AuditEntry[] = [];
  return {
    append(event) {
      const entry = { sequence: log.length, timestamp: new Date(now()).toISOString(), event, previousHash: GENESIS_HASH, hash: GENESIS_HASH };
      log.push(entry);
      return entry;
    },
    entries() {
      return log;
    },
  };
}

// TODO: return the index of the first entry whose sequence, previousHash or hash does not match
export function verifyAuditChain(entries: AuditEntry[]): ChainCheck {
  return { valid: true };
}

// TODO: decide every tool call, audit it with an argumentsHash (never raw arguments), run allowed calls only, and return one tool message per call
export async function runGovernedToolCalls(
  response: GenerateResponse,
  context: { agentId: string; purpose: string; onBehalfOf?: string },
  policy: PolicyDecisionPoint,
  audit: AuditLog,
  tools: Record<string, ToolImplementation>,
): Promise<Message[]> {
  throw new Error('Not implemented');
}
