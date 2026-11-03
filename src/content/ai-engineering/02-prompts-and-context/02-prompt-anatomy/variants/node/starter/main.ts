import type { FinishReason, GenerateRequest, GenerateResponse, Message } from '@dojo/ai';

export interface PromptExample {
  input: string;
  output: string;
}

export interface OutputFormat {
  type: 'text' | 'json';
  description: string;
}

export interface PromptSpec {
  role: string;
  task: string;
  input: string;
  constraints?: string[];
  outputFormat?: OutputFormat;
  examples?: PromptExample[];
  context?: string;
}

export interface ChatModel {
  generate(request: GenerateRequest): Promise<GenerateResponse>;
}

export type PromptField = 'role' | 'task' | 'input' | 'examples';

export class PromptSpecError extends Error {
  constructor(
    readonly field: PromptField,
    message: string,
  ) {
    super(message);
    this.name = 'PromptSpecError';
  }
}

export class PromptRunError extends Error {
  constructor(
    readonly finishReason: FinishReason,
    readonly text: string,
  ) {
    super(`The model did not finish normally (${finishReason})`);
    this.name = 'PromptRunError';
  }
}

export function delimit(tag: string, content: string): string {
  // TODO: neutralize <tag> and </tag> inside the content (any case, optional spaces) as [tag] and [/tag]
  return `<${tag}>\n${content}\n</${tag}>`;
}

export function buildMessages(spec: PromptSpec): Message[] {
  // TODO: validate the spec, then build the system message, one user/assistant pair per example and the final user message
  const everything = [spec.role, spec.task, ...(spec.constraints ?? []), spec.outputFormat?.description, spec.context, spec.input];
  return [{ role: 'user', content: everything.filter(Boolean).join('\n') }];
}

export async function runPrompt(model: ChatModel, spec: PromptSpec): Promise<string> {
  // TODO: ask for JSON when the output format is json, and fail with PromptRunError when the finish reason is not stop
  const response = await model.generate({ messages: buildMessages(spec) });
  return response.text;
}
