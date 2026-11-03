import { ModelError } from '@dojo/ai';
import type { GenerateRequest, GenerateResponse } from '@dojo/ai';

export interface ChatModel {
  generate(request: GenerateRequest): Promise<GenerateResponse>;
}

export interface Claim {
  text: string;
  sourceId: string;
}

export type Validation = { ok: true; claims: Claim[] } | { ok: false; problems: string[] };

export interface ResearchTask {
  id: string;
  instruction: string;
  sourceIds: string[];
}

export interface GatherResult {
  accepted: Array<Claim & { taskId: string }>;
  quarantined: Array<{ taskId: string; problems: string[] }>;
}

export interface VoteOptions {
  model: ChatModel;
  voters: string[];
  quorum: number;
}

export interface VoteResult {
  status: 'consensus' | 'no_consensus';
  decision: string | null;
  rounds: number;
  ballots: Array<Array<string | null>>;
}

export interface DelegationLimits {
  maxDepth: number;
  maxFanOut: number;
  maxTotal: number;
}

export type DelegationDecision = { allowed: true } | { allowed: false; reason: 'cycle' | 'depth' | 'fan_out' | 'total' };

export const WORKER_SYSTEM = 'You are a research worker. Reply with JSON only: {"claims": [{"text": "...", "sourceId": "..."}]}, citing only the sources you were given.';

export function voterSystem(voter: string): string {
  return `You are ${voter}, an independent reviewer. Reply with JSON only: {"answer": "..."}.`;
}

export function validateWorkerOutput(response: GenerateResponse, allowedSourceIds: string[]): Validation {
  if (response.finishReason !== 'stop') {
    return { ok: false, problems: [`finish reason ${response.finishReason}`] };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(response.text);
  } catch {
    return { ok: false, problems: ['output is not valid JSON'] };
  }
  const claims = (parsed as { claims?: unknown } | null)?.claims;
  if (!Array.isArray(claims) || claims.length === 0) {
    return { ok: false, problems: ['no claims'] };
  }
  const problems: string[] = [];
  claims.forEach((claim, index) => {
    if (typeof claim?.text !== 'string' || claim.text.trim() === '') {
      problems.push(`claim ${index + 1} has no text`);
    }
    if (typeof claim?.sourceId !== 'string' || !allowedSourceIds.includes(claim.sourceId)) {
      problems.push(`claim ${index + 1} cites unknown source ${String(claim?.sourceId)}`);
    }
  });
  return problems.length === 0 ? { ok: true, claims: claims.map((claim) => ({ text: claim.text, sourceId: claim.sourceId })) } : { ok: false, problems };
}

async function runTask(task: ResearchTask, model: ChatModel, maxAttempts: number): Promise<Validation> {
  let problems: string[] = [];
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const feedback = problems.length === 0 ? '' : `\n\nYour previous answer was rejected: ${problems.join('; ')}. Fix these problems.`;
    try {
      const response = await model.generate({
        messages: [
          { role: 'system', content: WORKER_SYSTEM },
          { role: 'user', content: `${task.instruction}\nAllowed sources: ${task.sourceIds.join(', ')}${feedback}` },
        ],
        responseFormat: { type: 'json' },
      });
      const validation = validateWorkerOutput(response, task.sourceIds);
      if (validation.ok) {
        return validation;
      }
      problems = validation.problems;
    } catch (error) {
      if (!(error instanceof ModelError)) {
        throw error;
      }
      problems = [`model error ${error.code}`];
    }
  }
  return { ok: false, problems };
}

export async function gatherClaims(tasks: ResearchTask[], { model, maxAttempts }: { model: ChatModel; maxAttempts: number }): Promise<GatherResult> {
  const result: GatherResult = { accepted: [], quarantined: [] };
  for (const task of tasks) {
    const validation = await runTask(task, model, maxAttempts);
    if (validation.ok) {
      result.accepted.push(...validation.claims.map((claim) => ({ ...claim, taskId: task.id })));
    } else {
      result.quarantined.push({ taskId: task.id, problems: validation.problems });
    }
  }
  return result;
}

function normalize(answer: string): string {
  return answer.trim().toLowerCase();
}

async function ballot(model: ChatModel, voter: string, content: string): Promise<string | null> {
  try {
    const response = await model.generate({
      messages: [
        { role: 'system', content: voterSystem(voter) },
        { role: 'user', content },
      ],
      responseFormat: { type: 'json' },
    });
    if (response.finishReason !== 'stop') {
      return null;
    }
    const answer = JSON.parse(response.text)?.answer;
    return typeof answer === 'string' && answer.trim() !== '' ? normalize(answer) : null;
  } catch (error) {
    if (error instanceof ModelError || error instanceof SyntaxError) {
      return null;
    }
    throw error;
  }
}

function winner(ballots: Array<string | null>, voters: number, quorum: number): string | null {
  const counts = new Map<string, number>();
  ballots.forEach((answer) => {
    if (answer !== null) {
      counts.set(answer, (counts.get(answer) ?? 0) + 1);
    }
  });
  const [best] = [...counts.entries()].sort((left, right) => right[1] - left[1]);
  return best !== undefined && best[1] / voters >= quorum ? best[0] : null;
}

export async function voteIndependently(question: string, { model, voters, quorum }: VoteOptions): Promise<VoteResult> {
  const first = await Promise.all(voters.map((voter) => ballot(model, voter, question)));
  const firstWinner = winner(first, voters.length, quorum);
  if (firstWinner !== null) {
    return { status: 'consensus', decision: firstWinner, rounds: 1, ballots: [first] };
  }
  const shared = first.map((answer, index) => `- reviewer ${index + 1}: ${answer ?? '(abstained)'}`).join('\n');
  const discussion = `${question}\n\nThe reviewers disagreed. Their independent answers were:\n${shared}\n\nReconsider the evidence and give your final answer.`;
  const second = await Promise.all(voters.map((voter) => ballot(model, voter, discussion)));
  const secondWinner = winner(second, voters.length, quorum);
  return { status: secondWinner === null ? 'no_consensus' : 'consensus', decision: secondWinner, rounds: 2, ballots: [first, second] };
}

export function createDelegationGuard(limits: DelegationLimits) {
  const children = new Map<string, number>();
  let total = 0;
  return {
    request(chain: string[], target: string): DelegationDecision {
      if (chain.includes(target)) {
        return { allowed: false, reason: 'cycle' };
      }
      if (chain.length > limits.maxDepth) {
        return { allowed: false, reason: 'depth' };
      }
      const parent = chain.join('/');
      if ((children.get(parent) ?? 0) >= limits.maxFanOut) {
        return { allowed: false, reason: 'fan_out' };
      }
      if (total >= limits.maxTotal) {
        return { allowed: false, reason: 'total' };
      }
      children.set(parent, (children.get(parent) ?? 0) + 1);
      total += 1;
      return { allowed: true };
    },
    get total() {
      return total;
    },
  };
}
