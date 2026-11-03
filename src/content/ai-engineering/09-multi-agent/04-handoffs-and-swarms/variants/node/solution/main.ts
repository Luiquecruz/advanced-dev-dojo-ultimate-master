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

export function handoffToolName(agentName: string): string {
  const slug = agentName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return `transfer_to_${slug}`;
}

export function handoffTools(agent: AgentSpec): ToolDefinition[] {
  return agent.handoffs.map((target) => ({
    name: handoffToolName(target),
    description: `Transfer the conversation to the ${target} agent when it is better suited to continue.`,
    parameters: {
      type: 'object',
      properties: { reason: { type: 'string', description: `Why ${target} should take over.` } },
      required: ['reason'],
    },
  }));
}

export function isPingPong(path: string[]): boolean {
  if (path.length < 4) {
    return false;
  }
  const [first, second, third, fourth] = path.slice(-4);
  return first !== second && first === third && second === fourth;
}

function reasonOf(rawArguments: string): string {
  try {
    const parsed = JSON.parse(rawArguments);
    return typeof parsed?.reason === 'string' ? parsed.reason : '';
  } catch {
    return '';
  }
}

export async function runSwarm(userMessage: string, { model, agents, entry, maxHandoffs, maxTurns }: SwarmOptions): Promise<SwarmResult> {
  const history: Message[] = [{ role: 'user', content: userMessage }];
  const path = [entry];
  const handoffs: Handoff[] = [];
  let current = entry;
  let turns = 0;
  const finish = (status: SwarmStatus, answer: string | null): SwarmResult => ({ status, answer, agent: current, path, handoffs, turns });

  while (turns < maxTurns) {
    const agent = agents[current];
    const response = await model.generate({
      messages: [{ role: 'system', content: agent.instructions }, ...history],
      tools: handoffTools(agent),
    });
    turns += 1;
    const call = response.toolCalls[0];
    if (call === undefined) {
      return finish('answered', response.text);
    }
    const target = agent.handoffs.find((name) => handoffToolName(name) === call.name);
    if (target === undefined) {
      history.push(
        { role: 'assistant', content: response.text, toolCalls: [call] },
        { role: 'tool', toolCallId: call.id, content: `"${call.name}" is not an available handoff. Answer directly or transfer to: ${agent.handoffs.join(', ') || 'nobody'}.` },
      );
      continue;
    }
    if (isPingPong([...path, target])) {
      return finish('ping_pong', null);
    }
    if (handoffs.length >= maxHandoffs) {
      return finish('handoff_limit', null);
    }
    const reason = reasonOf(call.arguments);
    history.push(
      { role: 'assistant', content: response.text, toolCalls: [call] },
      { role: 'tool', toolCallId: call.id, content: `Transferred from ${current} to ${target}. Reason: ${reason}` },
    );
    handoffs.push({ from: current, to: target, reason });
    path.push(target);
    current = target;
  }
  return finish('turn_limit', null);
}
