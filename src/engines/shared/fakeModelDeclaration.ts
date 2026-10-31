/**
 * Editor declarations of the fake model modules, so learners get autocomplete for `@dojo/ai` and `@dojo/ai/testing`.
 */
export const FAKE_MODEL_DECLARATION = `
declare module '@dojo/ai' {
  export type Role = 'system' | 'user' | 'assistant' | 'tool';
  export type FinishReason = 'stop' | 'length' | 'tool_calls' | 'refusal' | 'content_filter';
  export type ModelErrorCode = 'rate_limit' | 'server_error' | 'overloaded' | 'timeout' | 'context_length' | 'invalid_request' | 'authentication';
  export interface ToolCall { id: string; name: string; arguments: string }
  export interface Message { role: Role; content: string; toolCalls?: ToolCall[]; toolCallId?: string }
  export interface ToolDefinition { name: string; description?: string; parameters?: Record<string, unknown> }
  export interface GenerateRequest {
    model?: string;
    messages: Message[];
    tools?: ToolDefinition[];
    responseFormat?: { type: 'text' } | { type: 'json'; schema?: Record<string, unknown> };
    maxTokens?: number;
    temperature?: number;
    signal?: AbortSignal;
  }
  export interface Usage { inputTokens: number; outputTokens: number; totalTokens: number; cost: number }
  export interface GenerateResponse { id: string; model: string; text: string; toolCalls: ToolCall[]; finishReason: FinishReason; usage: Usage }
  export type StreamChunk = { type: 'text'; delta: string } | { type: 'tool-call'; toolCall: ToolCall } | { type: 'finish'; finishReason: FinishReason; usage: Usage };
  export interface Model {
    readonly name: string;
    readonly contextWindow: number;
    generate(request: GenerateRequest): Promise<GenerateResponse>;
    stream(request: GenerateRequest): AsyncGenerator<StreamChunk>;
  }
  export class ModelError extends Error {
    readonly status: number;
    readonly code: ModelErrorCode;
    readonly retryAfterMs?: number;
    constructor(status: number, code: ModelErrorCode, message: string, retryAfterMs?: number);
  }
  export function createModel(options?: { model?: string }): Model;
  export function countTokens(input: string | Message[]): number;
  export function embed(text: string, options?: { dimensions?: number }): number[];
  export function embed(texts: string[], options?: { dimensions?: number }): number[][];
  export function cosineSimilarity(left: number[], right: number[]): number;
}

declare module '@dojo/ai/testing' {
  import type { FinishReason, GenerateRequest, GenerateResponse, ModelErrorCode } from '@dojo/ai';
  export interface ModelReply {
    text?: string;
    toolCalls?: Array<{ name: string; arguments: string | Record<string, unknown>; id?: string }>;
    finishReason?: FinishReason;
    delayMs?: number;
    error?: { status: number; code: ModelErrorCode; message?: string; retryAfterMs?: number };
    failAfterChunks?: number;
  }
  export interface BehaviorContext { request: GenerateRequest; callIndex: number; random(): number; pick<T>(items: readonly T[]): T }
  export type Behavior = ModelReply | ((context: BehaviorContext) => ModelReply);
  export interface FakeModel {
    reply(...behaviors: Behavior[]): FakeModel;
    forModel(name: string): { reply(...behaviors: Behavior[]): FakeModel };
    handle(handler: (request: GenerateRequest, context: BehaviorContext) => Behavior | undefined): FakeModel;
    seed(value: number): FakeModel;
    configure(config: Partial<{ model: string; contextWindow: number; latencyMs: number; pricing: { inputPerMillion: number; outputPerMillion: number }; tokenizerDrift: number }>): FakeModel;
    replay(cassette: { model: string; recordedAt: string; replies: ModelReply[] }): FakeModel;
    readonly requests: readonly GenerateRequest[];
    readonly responses: readonly GenerateResponse[];
    readonly pending: number;
    reset(): FakeModel;
  }
  export const fakeModel: FakeModel;
  export const respond: {
    text(text: string | readonly string[]): Behavior;
    json(value: unknown): Behavior;
    malformedJson(value?: unknown): Behavior;
    toolCall(name: string, args?: Record<string, unknown>): Behavior;
    toolCalls(calls: Array<{ name: string; arguments?: Record<string, unknown> }>): Behavior;
    invalidToolArguments(name: string): Behavior;
    unknownTool(name?: string): Behavior;
    refusal(text?: string): Behavior;
    contentFilter(text?: string): Behavior;
    truncated(text: string, keepRatio?: number): Behavior;
    error(status: 400 | 401 | 429 | 500 | 503 | 504 | 529, options?: { retryAfterMs?: number; message?: string }): Behavior;
    contextLength(): Behavior;
    failMidStream(text: string, options?: { status?: 429 | 500 | 503 | 529; afterChunks?: number }): Behavior;
    slow(delayMs: number, behavior: Behavior): Behavior;
    oneOf(behaviors: readonly Behavior[]): Behavior;
    sometimes(probability: number, behavior: Behavior, otherwise: Behavior): Behavior;
  };
  export function forEachSeed(count: number, run: (seed: number) => unknown | Promise<unknown>): Promise<void>;
}
`;
