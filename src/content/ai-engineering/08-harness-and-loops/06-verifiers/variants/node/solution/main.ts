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

async function firstFailure(verifiers: Verifier[], output: string): Promise<{ verifier: string; feedback: string } | undefined> {
  for (const verifier of verifiers) {
    const result = await verifier.check(output);
    if (!result.passed) {
      return { verifier: verifier.name, feedback: result.feedback ?? '' };
    }
  }
  return undefined;
}

export async function runVerified(model: ChatModel, task: Task, { verifiers, maxAttempts }: VerifyOptions): Promise<VerifiedResult> {
  const messages: Message[] = [...(task.system === undefined ? [] : [{ role: 'system' as const, content: task.system }]), { role: 'user', content: task.prompt }];
  const failures: VerificationFailure[] = [];
  let output = '';
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const response = await model.generate({ messages: [...messages] });
    output = response.text;
    const failure =
      response.finishReason === 'stop'
        ? await firstFailure(verifiers, output)
        : { verifier: 'completion', feedback: `The answer is incomplete (finish reason: ${response.finishReason}). Give a complete answer.` };
    if (failure === undefined) {
      return { status: 'passed', output, attempts: attempt, failures };
    }
    failures.push({ attempt, ...failure });
    if (attempt < maxAttempts) {
      messages.push({ role: 'assistant', content: output });
      messages.push({ role: 'user', content: `Verifier "${failure.verifier}" failed:\n${failure.feedback}\nFix the problem and answer again with the complete result only.` });
    }
  }
  return { status: 'failed', output, attempts: maxAttempts, failures };
}

export function schemaVerifier(schema: ZodType): Verifier {
  return {
    name: 'schema',
    check(output) {
      let value: unknown;
      try {
        value = JSON.parse(output);
      } catch (error) {
        return { passed: false, feedback: `Not valid JSON: ${(error as Error).message}` };
      }
      const result = schema.safeParse(value);
      if (result.success) {
        return { passed: true };
      }
      const lines = result.error.issues.map((issue) => `${issue.path.length === 0 ? '(root)' : issue.path.map(String).join('.')}: ${issue.message}`);
      return { passed: false, feedback: lines.join('\n') };
    },
  };
}

export function examplesVerifier({ shouldMatch, shouldReject }: { shouldMatch: string[]; shouldReject: string[] }): Verifier {
  return {
    name: 'examples',
    check(output) {
      let pattern: RegExp;
      try {
        pattern = new RegExp(`^(?:${output.trim()})$`);
      } catch (error) {
        return { passed: false, feedback: `Not a valid regular expression: ${(error as Error).message}` };
      }
      const lines = [
        ...shouldMatch.filter((example) => !pattern.test(example)).map((example) => `should match: "${example}"`),
        ...shouldReject.filter((example) => pattern.test(example)).map((example) => `should not match: "${example}"`),
      ];
      return lines.length === 0 ? { passed: true } : { passed: false, feedback: lines.join('\n') };
    },
  };
}
