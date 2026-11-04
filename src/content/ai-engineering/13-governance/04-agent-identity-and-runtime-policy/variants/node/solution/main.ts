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

const CLASSIFICATION_RANK: Classification[] = ['public', 'internal', 'confidential', 'restricted'];

export function createPolicyDecisionPoint({ agents, tools }: { agents: AgentIdentity[]; tools: ToolSpec[] }): PolicyDecisionPoint {
  const agentsById = new Map(agents.map((agent) => [agent.id, { ...agent }]));
  const toolsByName = new Map(tools.map((tool) => [tool.name, tool]));

  function decision(request: DecisionRequest, effect: Effect, reasons: string[]): Decision {
    return { ...request, effect, reasons };
  }

  return {
    decide(request) {
      const agent = agentsById.get(request.agentId);
      if (!agent) {
        return decision(request, 'deny', ['unknown-agent']);
      }
      if (agent.status !== 'active') {
        return decision(request, 'deny', ['agent-suspended']);
      }
      const tool = toolsByName.get(request.tool);
      if (!tool) {
        return decision(request, 'deny', ['unknown-tool']);
      }
      const denyReasons: string[] = [];
      if (!agent.scopes.includes(tool.scope)) {
        denyReasons.push('missing-scope');
      }
      if (!agent.purposes.includes(request.purpose)) {
        denyReasons.push('purpose-not-allowed');
      }
      if (CLASSIFICATION_RANK.indexOf(tool.classification) > CLASSIFICATION_RANK.indexOf(agent.clearance)) {
        denyReasons.push('above-clearance');
      }
      if (denyReasons.length > 0) {
        return decision(request, 'deny', denyReasons);
      }
      const askReasons: string[] = [];
      if (tool.sideEffect === 'external') {
        askReasons.push('external-side-effect');
      }
      if (tool.sideEffect === 'write' && agent.riskTier === 'high') {
        askReasons.push('high-risk-write');
      }
      return askReasons.length > 0 ? decision(request, 'ask', askReasons) : decision(request, 'allow', ['within-policy']);
    },
    suspend(agentId) {
      const agent = agentsById.get(agentId);
      if (!agent) {
        return false;
      }
      agent.status = 'suspended';
      return true;
    },
  };
}

function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

function hashEntry(sequence: number, timestamp: string, previousHash: string, event: Record<string, unknown>): string {
  return sha256(JSON.stringify([sequence, timestamp, previousHash, event]));
}

const copyEntry = (entry: AuditEntry): AuditEntry => JSON.parse(JSON.stringify(entry));

export function createAuditLog({ now }: { now: () => number }): AuditLog {
  const log: AuditEntry[] = [];
  return {
    append(event) {
      const sequence = log.length;
      const timestamp = new Date(now()).toISOString();
      const previousHash = sequence === 0 ? GENESIS_HASH : log[sequence - 1].hash;
      const storedEvent = JSON.parse(JSON.stringify(event));
      const entry: AuditEntry = { sequence, timestamp, event: storedEvent, previousHash, hash: hashEntry(sequence, timestamp, previousHash, storedEvent) };
      log.push(entry);
      return copyEntry(entry);
    },
    entries() {
      return log.map(copyEntry);
    },
  };
}

export function verifyAuditChain(entries: AuditEntry[]): ChainCheck {
  for (let index = 0; index < entries.length; index++) {
    const entry = entries[index];
    const expectedPrevious = index === 0 ? GENESIS_HASH : entries[index - 1].hash;
    const intact = entry.sequence === index && entry.previousHash === expectedPrevious && entry.hash === hashEntry(entry.sequence, entry.timestamp, entry.previousHash, entry.event);
    if (!intact) {
      return { valid: false, brokenAt: index };
    }
  }
  return { valid: true };
}

function parseArguments(text: string): Record<string, unknown> | undefined {
  try {
    const parsed = JSON.parse(text);
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export async function runGovernedToolCalls(
  response: GenerateResponse,
  context: { agentId: string; purpose: string; onBehalfOf?: string },
  policy: PolicyDecisionPoint,
  audit: AuditLog,
  tools: Record<string, ToolImplementation>,
): Promise<Message[]> {
  const messages: Message[] = [];
  for (const toolCall of response.toolCalls) {
    const decision = policy.decide({ ...context, tool: toolCall.name });
    audit.append({ type: 'tool-decision', ...context, tool: toolCall.name, effect: decision.effect, reasons: decision.reasons, argumentsHash: sha256(toolCall.arguments) });
    let content: string;
    if (decision.effect === 'deny') {
      content = `Denied: ${decision.reasons.join(', ')}`;
    } else if (decision.effect === 'ask') {
      content = `Approval required: ${decision.reasons.join(', ')}`;
    } else {
      const args = parseArguments(toolCall.arguments);
      const implementation = tools[toolCall.name];
      if (args === undefined) {
        content = 'Error: arguments are not a JSON object';
      } else if (implementation === undefined) {
        content = `Error: no implementation for ${toolCall.name}`;
      } else {
        try {
          content = await implementation(args);
        } catch (error) {
          content = `Error: ${(error as Error).message}`;
        }
      }
    }
    messages.push({ role: 'tool', toolCallId: toolCall.id, content });
  }
  return messages;
}
