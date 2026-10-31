import type { FinishReason, GenerateRequest, GenerateResponse, StreamChunk, Usage } from '@dojo/ai';

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
  // TODO: optional system message first, then the user message; include maxTokens only when given
  return { messages: [{ role: 'user', content: input.prompt }] };
}

export function statusFor(finishReason: FinishReason): CompletionStatus {
  // TODO: 'length' is truncated, 'refusal' and 'content_filter' are refused, everything else is complete
  return 'complete';
}

export async function complete(model: ChatModel, input: CompletionInput): Promise<CompletionResult> {
  // TODO: call model.generate once and return { status, text, finishReason, usage } from the response
  return { status: 'complete', text: '', finishReason: 'stop', usage: EMPTY_USAGE };
}

export async function completeStream(model: ChatModel, input: CompletionInput, onDelta: (delta: string) => void = () => {}): Promise<CompletionResult> {
  // TODO: iterate model.stream(...), forward and concatenate text deltas, read finishReason and usage from the finish chunk
  return { status: 'complete', text: '', finishReason: 'stop', usage: EMPTY_USAGE };
}
