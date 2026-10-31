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

const RETRYABLE_STATUSES = new Set([429, 500, 503, 504, 529]);

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function isRetryable(error: unknown): boolean {
  return error instanceof ModelError && RETRYABLE_STATUSES.has(error.status);
}

export function retryDelay(attempt: number, error: unknown, { baseMs, maxMs, random = Math.random }: RetryOptions): number {
  if (error instanceof ModelError && error.retryAfterMs !== undefined) {
    return error.retryAfterMs;
  }
  return random() * Math.min(maxMs, baseMs * 2 ** attempt);
}

export async function generateWithRetry(model: ChatModel, request: GenerateRequest, options: RetryOptions): Promise<GenerateResponse> {
  const sleep = options.sleep ?? wait;
  for (let attempt = 0; ; attempt++) {
    try {
      return await model.generate(request);
    } catch (error) {
      if (attempt >= options.retries || !isRetryable(error)) {
        throw error;
      }
      await sleep(retryDelay(attempt, error, options));
    }
  }
}

export async function generateWithFallback(primary: ChatModel, backup: ChatModel, request: GenerateRequest, options: RetryOptions): Promise<{ response: GenerateResponse; model: string }> {
  try {
    return { response: await generateWithRetry(primary, request, options), model: primary.name };
  } catch (error) {
    if (!isRetryable(error)) {
      throw error;
    }
    return { response: await generateWithRetry(backup, request, options), model: backup.name };
  }
}

async function tryCheap(model: ChatModel, request: GenerateRequest, options: RouterOptions): Promise<string | undefined> {
  try {
    const response = await generateWithRetry(model, request, options);
    return options.validate(response.text) ? response.text : undefined;
  } catch {
    return undefined;
  }
}

export async function answer(request: GenerateRequest, options: RouterOptions): Promise<RoutedAnswer> {
  const { cheap, strong, backup } = options.models;
  const cheapText = await tryCheap(cheap, request, options);
  if (cheapText !== undefined) {
    return { text: cheapText, model: cheap.name, escalated: false };
  }
  const escalated = await generateWithFallback(strong, backup, request, options);
  if (!options.validate(escalated.response.text)) {
    throw new InvalidAnswerError(`The answer from ${escalated.model} failed validation`);
  }
  return { text: escalated.response.text, model: escalated.model, escalated: true };
}
