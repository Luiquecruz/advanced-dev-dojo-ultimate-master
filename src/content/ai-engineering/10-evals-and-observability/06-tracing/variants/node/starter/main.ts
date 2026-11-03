import { randomBytes } from 'node:crypto';
import type { GenerateRequest, GenerateResponse } from '@dojo/ai';

export interface ChatModel {
  name: string;
  generate(request: GenerateRequest): Promise<GenerateResponse>;
}

export interface Tool {
  name: string;
  description: string;
  execute(args: Record<string, unknown>, callId?: string): unknown;
}

export type SpanKind = 'client' | 'internal';
export type SpanStatus = 'unset' | 'ok' | 'error';
export type AttributeValue = string | number | boolean | string[];

export interface Span {
  traceId: string;
  spanId: string;
  parentSpanId: string | null;
  name: string;
  kind: SpanKind;
  startMs: number;
  endMs: number | null;
  status: SpanStatus;
  attributes: Record<string, AttributeValue>;
  setAttribute(key: string, value: AttributeValue): void;
  end(status?: SpanStatus): void;
}

export interface SpanOptions {
  parent?: Span;
  kind?: SpanKind;
  attributes?: Record<string, AttributeValue>;
}

export interface TracerOptions {
  now?: () => number;
  captureContent?: boolean;
  newId?: (bytes: number) => string;
}

export interface Tracer {
  readonly captureContent: boolean;
  readonly spans: Span[];
  startSpan(name: string, options?: SpanOptions): Span;
}

export interface Pricing {
  inputPerMillion: number;
  outputPerMillion: number;
}

export interface TraceSummary {
  traceId: string;
  spans: number;
  modelCalls: number;
  toolCalls: number;
  errors: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  durationMs: number;
  unpricedModels: string[];
}

export function createTracer({ now = Date.now, captureContent = false, newId = (bytes) => randomBytes(bytes).toString('hex') }: TracerOptions = {}): Tracer {
  // TODO: a root span starts a new 32-hex trace id; a child copies its parent's trace id and points to its span id; record spans when they end, once
  const spans: Span[] = [];
  return {
    captureContent,
    spans,
    startSpan(name, { kind = 'internal', attributes = {} } = {}) {
      const span: Span = {
        traceId: newId(16),
        spanId: newId(8),
        parentSpanId: null,
        name,
        kind,
        startMs: now(),
        endMs: null,
        status: 'unset',
        attributes,
        setAttribute(key, value) {
          span.attributes[key] = value;
        },
        end(status) {
          span.endMs = now();
          span.status = status ?? span.status;
        },
      };
      spans.push(span);
      return span;
    },
  };
}

export function tracedModel(model: ChatModel, tracer: Tracer, { provider, parent }: { provider: string; parent?: Span }): ChatModel {
  // TODO: one client span "chat <model>" per call with the GenAI attributes, usage, error.type on failure, and content only when tracer.captureContent
  return model;
}

export function tracedTool(tool: Tool, tracer: Tracer, { parent }: { parent?: Span } = {}): Tool {
  // TODO: one internal span "execute_tool <name>" per call with the tool attributes, error.type on failure, and arguments and result only when tracer.captureContent
  return tool;
}

export function summarizeTrace(spans: Span[], traceId: string, pricing: Record<string, Pricing>): TraceSummary {
  // TODO: roll up the spans of one trace: counts, errors, tokens, cost from the price table, duration, unpriced models
  throw new Error('Not implemented');
}
