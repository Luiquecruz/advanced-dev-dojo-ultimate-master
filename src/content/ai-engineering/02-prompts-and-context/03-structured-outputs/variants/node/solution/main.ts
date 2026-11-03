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

function tryParse(text: string): ParseResult {
  try {
    return { ok: true, value: JSON.parse(text), repaired: true };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

export function parseModelJson(text: string): ParseResult {
  const direct = tryParse(text.trim());
  if (direct.ok) {
    return { ...direct, repaired: false };
  }
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end < start) {
    return { ok: false, error: 'No complete JSON object found in the reply' };
  }
  const withoutTrailingCommas = text.slice(start, end + 1).replace(/,(\s*[}\]])/g, '$1');
  const extracted = tryParse(withoutTrailingCommas);
  if (extracted.ok) {
    return extracted;
  }
  const doubleQuoted = tryParse(withoutTrailingCommas.replace(/'/g, '"'));
  return doubleQuoted.ok ? doubleQuoted : extracted;
}

function feedback(problem: string): Message {
  return { role: 'user', content: `Your previous reply could not be used:\n${problem}\nReply again with only the corrected JSON object.` };
}

export async function generateStructured<Schema extends z.ZodType>(
  model: ChatModel,
  { messages, schema, maxAttempts = 3 }: StructuredRequest<Schema>,
): Promise<StructuredResult<z.infer<Schema>>> {
  const responseFormat = { type: 'json' as const, schema: z.toJSONSchema(schema) as Record<string, unknown> };
  let conversation = [...messages];
  let lastError = '';
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const response = await model.generate({ messages: conversation, responseFormat });
    if (response.finishReason === 'refusal' || response.finishReason === 'content_filter') {
      throw new StructuredOutputError('refusal', attempt, response.text || response.finishReason);
    }
    if (response.finishReason === 'length') {
      lastError = 'The reply was cut off by the token limit before the JSON object was complete.';
    } else {
      const parsed = parseModelJson(response.text);
      if (parsed.ok) {
        const validated = schema.safeParse(parsed.value);
        if (validated.success) {
          return { value: validated.data, attempts: attempt, repaired: parsed.repaired };
        }
        lastError = z.prettifyError(validated.error);
      } else {
        lastError = `The reply is not valid JSON: ${parsed.error}`;
      }
    }
    conversation = [...conversation, { role: 'assistant', content: response.text }, feedback(lastError)];
  }
  throw new StructuredOutputError('exhausted', maxAttempts, lastError);
}
