import { z } from 'zod';
import type { GenerateRequest, GenerateResponse, Message } from '@dojo/ai';

export interface ChatModel {
  generate(request: GenerateRequest): Promise<GenerateResponse>;
}

export type ParseResult = { ok: true; value: unknown; repaired: boolean } | { ok: false; error: string };

export interface StructuredRequest<Schema extends z.ZodType> {
  messages: Message[];
  schema: Schema;
  maxAttempts?: number;
}

export interface StructuredResult<Value> {
  value: Value;
  attempts: number;
  repaired: boolean;
}

export type StructuredFailure = 'refusal' | 'exhausted';

export class StructuredOutputError extends Error {
  constructor(
    readonly reason: StructuredFailure,
    readonly attempts: number,
    readonly lastError: string,
  ) {
    super(reason === 'refusal' ? `The model declined to answer: ${lastError}` : `No valid output after ${attempts} attempts: ${lastError}`);
    this.name = 'StructuredOutputError';
  }
}

export function parseModelJson(text: string): ParseResult {
  // TODO: parse directly; otherwise extract the object from prose and fences, drop trailing commas, then try double quotes
  try {
    return { ok: true, value: JSON.parse(text), repaired: false };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

export async function generateStructured<Schema extends z.ZodType>(
  model: ChatModel,
  { messages, schema, maxAttempts = 3 }: StructuredRequest<Schema>,
): Promise<StructuredResult<z.infer<Schema>>> {
  // TODO: request JSON with the schema, stop on refusals, repair and validate, and re-ask with the error up to maxAttempts calls
  const response = await model.generate({ messages, responseFormat: { type: 'json' } });
  return { value: JSON.parse(response.text), attempts: 1, repaired: false };
}
