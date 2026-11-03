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

const isBlank = (value: string | undefined) => value === undefined || value.trim() === '';

export function delimit(tag: string, content: string): string {
  const sameTag = new RegExp(`<\\s*(\\/?)\\s*${tag}\\s*>`, 'gi');
  const neutralized = content.replace(sameTag, (_, slash: string) => `[${slash}${tag}]`);
  return `<${tag}>\n${neutralized}\n</${tag}>`;
}

function validate(spec: PromptSpec): void {
  if (isBlank(spec.role)) {
    throw new PromptSpecError('role', 'A prompt needs a role');
  }
  if (isBlank(spec.task)) {
    throw new PromptSpecError('task', 'A prompt needs a task');
  }
  if (isBlank(spec.input)) {
    throw new PromptSpecError('input', 'A prompt needs an input');
  }
  (spec.examples ?? []).forEach((example, index) => {
    if (isBlank(example.input) || isBlank(example.output)) {
      throw new PromptSpecError('examples', `Example ${index + 1} needs an input and an output`);
    }
  });
}

function systemContent(spec: PromptSpec): string {
  const sections = [spec.role];
  const constraints = spec.constraints ?? [];
  if (constraints.length > 0) {
    sections.push(`Constraints:\n${constraints.map((constraint) => `- ${constraint}`).join('\n')}`);
  }
  if (spec.outputFormat) {
    sections.push(`Output format: ${spec.outputFormat.description}`);
  }
  return sections.join('\n\n');
}

export function buildMessages(spec: PromptSpec): Message[] {
  validate(spec);
  const examples = (spec.examples ?? []).flatMap((example): Message[] => [
    { role: 'user', content: delimit('input', example.input) },
    { role: 'assistant', content: example.output },
  ]);
  const finalParts = [spec.context === undefined ? undefined : delimit('context', spec.context), spec.task, delimit('input', spec.input)];
  return [
    { role: 'system', content: systemContent(spec) },
    ...examples,
    { role: 'user', content: finalParts.filter((part) => part !== undefined).join('\n\n') },
  ];
}

export async function runPrompt(model: ChatModel, spec: PromptSpec): Promise<string> {
  const request: GenerateRequest = { messages: buildMessages(spec) };
  if (spec.outputFormat?.type === 'json') {
    request.responseFormat = { type: 'json' };
  }
  const response = await model.generate(request);
  if (response.finishReason !== 'stop') {
    throw new PromptRunError(response.finishReason, response.text);
  }
  return response.text;
}
