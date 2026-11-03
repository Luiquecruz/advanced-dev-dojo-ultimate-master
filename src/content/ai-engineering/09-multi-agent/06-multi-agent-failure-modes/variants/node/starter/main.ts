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

// TODO: reject unfinished replies, invalid JSON, missing or empty claims, blank texts and sources outside allowedSourceIds, listing every problem
export function validateWorkerOutput(response: GenerateResponse, allowedSourceIds: string[]): Validation {
  return { ok: true, claims: JSON.parse(response.text).claims };
}

// TODO: validate every worker output, retry with the problems as feedback up to maxAttempts, quarantine what still fails
export async function gatherClaims(tasks: ResearchTask[], { model }: { model: ChatModel; maxAttempts: number }): Promise<GatherResult> {
  const result: GatherResult = { accepted: [], quarantined: [] };
  for (const task of tasks) {
    const response = await model.generate({
      messages: [
        { role: 'system', content: WORKER_SYSTEM },
        { role: 'user', content: `${task.instruction}\nAllowed sources: ${task.sourceIds.join(', ')}` },
      ],
      responseFormat: { type: 'json' },
    });
    const validation = validateWorkerOutput(response, task.sourceIds);
    if (validation.ok) {
      result.accepted.push(...validation.claims.map((claim) => ({ ...claim, taskId: task.id })));
    }
  }
  return result;
}

// TODO: first round in parallel and blind, quorum over all voters (abstentions included), a discussion round with anonymous answers only when needed
export async function voteIndependently(question: string, { model, voters, quorum }: VoteOptions): Promise<VoteResult> {
  const answers: Array<string | null> = [];
  for (const voter of voters) {
    const earlier = answers.length === 0 ? '' : `\n\nOther reviewers answered: ${answers.join(', ')}`;
    const response = await model.generate({
      messages: [
        { role: 'system', content: voterSystem(voter) },
        { role: 'user', content: `${question}${earlier}` },
      ],
      responseFormat: { type: 'json' },
    });
    answers.push(JSON.parse(response.text).answer);
  }
  const top = answers.filter((answer) => answer === answers[0]).length;
  return top / voters.length >= quorum
    ? { status: 'consensus', decision: answers[0], rounds: 1, ballots: [answers] }
    : { status: 'no_consensus', decision: null, rounds: 1, ballots: [answers] };
}

// TODO: check cycle, depth, fan-out per delegating chain and total, in that order; count only allowed delegations
export function createDelegationGuard(limits: DelegationLimits) {
  let total = 0;
  return {
    request(chain: string[], target: string): DelegationDecision {
      if (chain.length > limits.maxDepth) {
        return { allowed: false, reason: 'depth' };
      }
      total += 1;
      return { allowed: true };
    },
    get total() {
      return total;
    },
  };
}
