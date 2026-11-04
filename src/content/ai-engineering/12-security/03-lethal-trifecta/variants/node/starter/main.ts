export type Leg = 'privateData' | 'untrustedContent' | 'externalCommunication';

export const LEGS: Leg[] = ['privateData', 'untrustedContent', 'externalCommunication'];

export interface ToolProfile {
  name: string;
  capabilities?: Leg[];
}

export interface SessionConfig {
  id: string;
  tools: string[];
  untrustedInputs?: string[];
  rendersRemoteImages?: boolean;
}

export interface AgentConfig {
  name: string;
  tools: ToolProfile[];
  sessions: SessionConfig[];
}

export interface SessionReport {
  sessionId: string;
  legs: Record<Leg, string[]>;
  lethal: boolean;
}

export interface AgentReport {
  agent: string;
  sessions: SessionReport[];
  lethalSessions: string[];
}

export interface Removal {
  leg: Leg;
  sources: string[];
}

export type GuardDecision = { allowed: true; legs: Leg[] } | { allowed: false; reason: 'lethal_trifecta'; legs: Leg[] };

export function analyzeSession(session: SessionConfig, tools: ToolProfile[]): SessionReport {
  // TODO: unlabeled or unknown tools count as every leg; add untrusted inputs ("input:<label>") and remote images ("remote-images")
  const legs: Record<Leg, string[]> = { privateData: [], untrustedContent: [], externalCommunication: [] };
  for (const toolName of session.tools) {
    const profile = tools.find((tool) => tool.name === toolName);
    for (const leg of profile?.capabilities ?? []) {
      legs[leg].push(toolName);
    }
  }
  return { sessionId: session.id, legs, lethal: LEGS.every((leg) => legs[leg].length > 0) };
}

export function analyzeAgent(config: AgentConfig): AgentReport {
  // TODO: analyze every session and list the ids of the lethal ones
  throw new Error('Not implemented');
}

export function suggestRemoval(report: SessionReport): Removal | null {
  // TODO: null when safe; otherwise the leg with the fewest sources (ties: externalCommunication, untrustedContent, privateData)
  throw new Error('Not implemented');
}

export function removeLeg(config: AgentConfig, sessionId: string, leg: Leg): AgentConfig {
  // TODO: return a new config whose session drops every tool, input or rendering that provides the leg; throw for an unknown session
  throw new Error('Not implemented');
}

export function createTrifectaGuard(tools: ToolProfile[], { initialLegs = [] }: { initialLegs?: Leg[] } = {}) {
  // TODO: deny (without recording) the call that would bring all three legs into the session
  return {
    authorize(toolName: string): GuardDecision {
      return { allowed: true, legs: [...initialLegs] };
    },
    legs(): Leg[] {
      return [...initialLegs];
    },
  };
}
