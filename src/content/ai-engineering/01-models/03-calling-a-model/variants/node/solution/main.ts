import type { FinishReason, GenerateRequest, GenerateResponse, Message, StreamChunk, Usage } from '@dojo/ai';

export interface ChatModel {
  generate(request: GenerateRequest): Promise<GenerateResponse>;
  stream(request: GenerateRequest): AsyncIterable<StreamChunk>;
}

export interface CompletionInput {
  prompt: string;
  system?: string;
  maxTokens?: number;
}

export type CompletionStatus = 'complete' | 'truncated' | 'refused';

export interface CompletionResult {
  status: CompletionStatus;
  text: string;
  finishReason: FinishReason;
  usage: Usage;
}

const EMPTY_USAGE: Usage = { inputTokens: 0, outputTokens: 0, totalTokens: 0, cost: 0 };

export function buildRequest(input: CompletionInput): GenerateRequest {
  const messages: Message[] = input.system === undefined ? [] : [{ role: 'system', content: input.system }];
  messages.push({ role: 'user', content: input.prompt });
  return input.maxTokens === undefined ? { messages } : { messages, maxTokens: input.maxTokens };
}

export function statusFor(finishReason: FinishReason): CompletionStatus {
  if (finishReason === 'length') {
    return 'truncated';
  }
  if (finishReason === 'refusal' || finishReason === 'content_filter') {
    return 'refused';
  }
  return 'complete';
}

export async function complete(model: ChatModel, input: CompletionInput): Promise<CompletionResult> {
  const response = await model.generate(buildRequest(input));
  return {
    status: statusFor(response.finishReason),
    text: response.text,
    finishReason: response.finishReason,
    usage: response.usage,
  };
}

export async function completeStream(model: ChatModel, input: CompletionInput, onDelta: (delta: string) => void = () => {}): Promise<CompletionResult> {
  let text = '';
  let finishReason: FinishReason = 'stop';
  let usage = EMPTY_USAGE;
  for await (const chunk of model.stream(buildRequest(input))) {
    if (chunk.type === 'text') {
      text += chunk.delta;
      onDelta(chunk.delta);
    }
    if (chunk.type === 'finish') {
      finishReason = chunk.finishReason;
      usage = chunk.usage;
    }
  }
  return { status: statusFor(finishReason), text, finishReason, usage };
}
