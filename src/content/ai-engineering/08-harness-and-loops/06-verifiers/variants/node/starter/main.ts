import type { GenerateRequest, GenerateResponse, Message } from '@dojo/ai';
import type { ZodType } from 'zod';

export interface ChatModel {
  generate(request: GenerateRequest): Promise<GenerateResponse>;
}

export interface VerifierResult {
  passed: boolean;
  feedback?: string;
}

export interface Verifier {
  name: string;
  check(output: string): VerifierResult | Promise<VerifierResult>;
}

export interface Task {
  prompt: string;
  system?: string;
}

export interface VerifyOptions {
  verifiers: Verifier[];
  maxAttempts: number;
}

export interface VerificationFailure {
  attempt: number;
  verifier: string;
  feedback: string;
}

export interface VerifiedResult {
  status: 'passed' | 'failed';
  output: string;
  attempts: number;
  failures: VerificationFailure[];
}

// TODO: up to maxAttempts model calls; check completion, run verifiers in order until one fails, feed the failure back, return passed or failed with every failure
export async function runVerified(model: ChatModel, task: Task, { verifiers, maxAttempts }: VerifyOptions): Promise<VerifiedResult> {
  const response = await model.generate({ messages: [{ role: 'user', content: task.prompt }] });
  return { status: 'passed', output: response.text, attempts: 1, failures: [] };
}

// TODO: "Not valid JSON..." when parsing fails, otherwise one "path: message" line per Zod issue
export function schemaVerifier(schema: ZodType): Verifier {
  return { name: 'schema', check: () => ({ passed: true }) };
}

// TODO: "Not a valid regular expression..." when it does not compile, otherwise one line per failing example; match whole strings
export function examplesVerifier({ shouldMatch, shouldReject }: { shouldMatch: string[]; shouldReject: string[] }): Verifier {
  return { name: 'examples', check: () => ({ passed: true }) };
}
