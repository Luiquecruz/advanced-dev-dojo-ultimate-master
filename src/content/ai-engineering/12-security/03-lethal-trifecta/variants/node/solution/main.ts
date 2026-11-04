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

const REMOVAL_PREFERENCE: Leg[] = ['externalCommunication', 'untrustedContent', 'privateData'];

function capabilitiesOf(toolName: string, tools: ToolProfile[]): Leg[] {
  const profile = tools.find((tool) => tool.name === toolName);
  if (!profile || profile.capabilities === undefined) {
    return [...LEGS];
  }
  return LEGS.filter((leg) => profile.capabilities!.includes(leg));
}

export function analyzeSession(session: SessionConfig, tools: ToolProfile[]): SessionReport {
  const legs: Record<Leg, string[]> = { privateData: [], untrustedContent: [], externalCommunication: [] };
  for (const toolName of session.tools) {
    for (const leg of capabilitiesOf(toolName, tools)) {
      if (!legs[leg].includes(toolName)) {
        legs[leg].push(toolName);
      }
    }
  }
  for (const input of session.untrustedInputs ?? []) {
    legs.untrustedContent.push(`input:${input}`);
  }
  if (session.rendersRemoteImages) {
    legs.externalCommunication.push('remote-images');
  }
  return { sessionId: session.id, legs, lethal: LEGS.every((leg) => legs[leg].length > 0) };
}

export function analyzeAgent(config: AgentConfig): AgentReport {
  const sessions = config.sessions.map((session) => analyzeSession(session, config.tools));
  return {
    agent: config.name,
    sessions,
    lethalSessions: sessions.filter((report) => report.lethal).map((report) => report.sessionId),
  };
}

export function suggestRemoval(report: SessionReport): Removal | null {
  if (!report.lethal) {
    return null;
  }
  const leg = REMOVAL_PREFERENCE.reduce((best, candidate) => (report.legs[candidate].length < report.legs[best].length ? candidate : best));
  return { leg, sources: [...report.legs[leg]] };
}

export function removeLeg(config: AgentConfig, sessionId: string, leg: Leg): AgentConfig {
  if (!config.sessions.some((session) => session.id === sessionId)) {
    throw new Error(`Unknown session "${sessionId}"`);
  }
  return {
    ...config,
    tools: config.tools.map((tool) => ({ ...tool, capabilities: tool.capabilities && [...tool.capabilities] })),
    sessions: config.sessions.map((session) => {
      if (session.id !== sessionId) {
        return { ...session, tools: [...session.tools], untrustedInputs: session.untrustedInputs && [...session.untrustedInputs] };
      }
      return {
        ...session,
        tools: session.tools.filter((toolName) => !capabilitiesOf(toolName, config.tools).includes(leg)),
        untrustedInputs: leg === 'untrustedContent' ? [] : session.untrustedInputs && [...session.untrustedInputs],
        rendersRemoteImages: leg === 'externalCommunication' ? false : session.rendersRemoteImages,
      };
    }),
  };
}

export function createTrifectaGuard(tools: ToolProfile[], { initialLegs = [] }: { initialLegs?: Leg[] } = {}) {
  let present = LEGS.filter((leg) => initialLegs.includes(leg));
  return {
    authorize(toolName: string): GuardDecision {
      const combined = LEGS.filter((leg) => present.includes(leg) || capabilitiesOf(toolName, tools).includes(leg));
      if (combined.length === LEGS.length) {
        return { allowed: false, reason: 'lethal_trifecta', legs: [...present] };
      }
      present = combined;
      return { allowed: true, legs: [...present] };
    },
    legs(): Leg[] {
      return [...present];
    },
  };
}
