import type { GenerateRequest, GenerateResponse, Message, ToolDefinition } from '@dojo/ai';

export interface ChatModel {
  generate(request: GenerateRequest): Promise<GenerateResponse>;
}

export interface AgentSpec {
  name: string;
  instructions: string;
  handoffs: string[];
}

export interface SwarmOptions {
  model: ChatModel;
  agents: Record<string, AgentSpec>;
  entry: string;
  maxHandoffs: number;
  maxTurns: number;
}

export type SwarmStatus = 'answered' | 'handoff_limit' | 'ping_pong' | 'turn_limit';

export interface Handoff {
  from: string;
  to: string;
  reason: string;
}

export interface SwarmResult {
  status: SwarmStatus;
  answer: string | null;
  agent: string;
  path: string[];
  handoffs: Handoff[];
  turns: number;
}

// TODO: lowercase, replace every run of other characters with "_", trim underscores at both ends
export function handoffToolName(agentName: string): string {
  return `transfer_to_${agentName}`;
}

// TODO: one tool per allowed target, with a required string "reason"
export function handoffTools(agent: AgentSpec): ToolDefinition[] {
  return agent.handoffs.map((target) => ({ name: handoffToolName(target), description: `Transfer to ${target}.` }));
}

// TODO: true when the last four agents alternate between two different agents (A, B, A, B)
export function isPingPong(path: string[]): boolean {
  return false;
}

// TODO: reject handoffs the current agent may not make, record the call and a tool result in the history, stop on ping-pong and on the handoff limit
export async function runSwarm(userMessage: string, { model, agents, entry, maxTurns }: SwarmOptions): Promise<SwarmResult> {
  const history: Message[] = [{ role: 'user', content: userMessage }];
  const path = [entry];
  const handoffs: Handoff[] = [];
  let current = entry;
  let turns = 0;
  while (turns < maxTurns) {
    const agent = agents[current];
    const response = await model.generate({
      messages: [{ role: 'system', content: agent.instructions }, ...history],
      tools: handoffTools(agent),
    });
    turns += 1;
    const call = response.toolCalls[0];
    if (call === undefined) {
      return { status: 'answered', answer: response.text, agent: current, path, handoffs, turns };
    }
    const target = call.name.replace('transfer_to_', '');
    handoffs.push({ from: current, to: target, reason: JSON.parse(call.arguments).reason });
    path.push(target);
    current = target;
  }
  return { status: 'turn_limit', answer: null, agent: current, path, handoffs, turns };
}
