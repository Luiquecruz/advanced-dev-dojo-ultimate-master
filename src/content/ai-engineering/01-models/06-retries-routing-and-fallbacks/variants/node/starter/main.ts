import { ModelError } from '@dojo/ai';
import type { GenerateRequest, GenerateResponse } from '@dojo/ai';

export interface ChatModel {
  name: string;
  generate(request: GenerateRequest): Promise<GenerateResponse>;
}

export interface RetryOptions {
  retries: number;
  baseMs: number;
  maxMs: number;
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
}

export interface RouterOptions extends RetryOptions {
  models: { cheap: ChatModel; strong: ChatModel; backup: ChatModel };
  validate: (text: string) => boolean;
}

export interface RoutedAnswer {
  text: string;
  model: string;
  escalated: boolean;
}

export class InvalidAnswerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidAnswerError';
  }
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function isRetryable(error: unknown): boolean {
  // TODO: true only for a ModelError with status 429, 500, 503, 504 or 529
  return error instanceof ModelError;
}

export function retryDelay(attempt: number, error: unknown, { baseMs, maxMs, random = Math.random }: RetryOptions): number {
  // TODO: use the error's retryAfterMs when present, otherwise random() * min(maxMs, baseMs * 2 ** attempt)
  return baseMs;
}

export async function generateWithRetry(model: ChatModel, request: GenerateRequest, options: RetryOptions): Promise<GenerateResponse> {
  // TODO: retry retryable errors up to options.retries times, sleeping retryDelay(...) between attempts
  return model.generate(request);
}

export async function generateWithFallback(primary: ChatModel, backup: ChatModel, request: GenerateRequest, options: RetryOptions): Promise<{ response: GenerateResponse; model: string }> {
  // TODO: when the primary still fails with a retryable error after its retries, try the backup; never fall back on other errors
  return { response: await generateWithRetry(primary, request, options), model: primary.name };
}

export async function answer(request: GenerateRequest, options: RouterOptions): Promise<RoutedAnswer> {
  // TODO: try the cheap model first; escalate to strong (with backup as fallback) when it fails or its answer is invalid
  const response = await options.models.strong.generate(request);
  return { text: response.text, model: options.models.strong.name, escalated: true };
}
