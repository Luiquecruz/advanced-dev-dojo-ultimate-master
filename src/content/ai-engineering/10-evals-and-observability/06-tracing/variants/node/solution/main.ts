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
  const spans: Span[] = [];
  return {
    captureContent,
    spans,
    startSpan(name, { parent, kind = 'internal', attributes = {} } = {}) {
      const span: Span = {
        traceId: parent ? parent.traceId : newId(16),
        spanId: newId(8),
        parentSpanId: parent ? parent.spanId : null,
        name,
        kind,
        startMs: now(),
        endMs: null,
        status: 'unset',
        attributes: { ...attributes },
        setAttribute(key, value) {
          span.attributes[key] = value;
        },
        end(status) {
          if (span.endMs !== null) {
            return;
          }
          span.endMs = now();
          span.status = status ?? span.status;
          spans.push(span);
        },
      };
      return span;
    },
  };
}

function errorType(error: unknown): string {
  const { code, name } = error as { code?: unknown; name?: unknown };
  if (typeof code === 'string') {
    return code;
  }
  return typeof name === 'string' ? name : 'Error';
}

export function tracedModel(model: ChatModel, tracer: Tracer, { provider, parent }: { provider: string; parent?: Span }): ChatModel {
  return {
    name: model.name,
    async generate(request) {
      const requestModel = request.model ?? model.name;
      const span = tracer.startSpan(`chat ${requestModel}`, {
        parent,
        kind: 'client',
        attributes: { 'gen_ai.operation.name': 'chat', 'gen_ai.provider.name': provider, 'gen_ai.request.model': requestModel },
      });
      if (request.maxTokens !== undefined) span.setAttribute('gen_ai.request.max_tokens', request.maxTokens);
      if (request.temperature !== undefined) span.setAttribute('gen_ai.request.temperature', request.temperature);
      if (tracer.captureContent) span.setAttribute('gen_ai.input.messages', JSON.stringify(request.messages));
      try {
        const response = await model.generate(request);
        span.setAttribute('gen_ai.response.id', response.id);
        span.setAttribute('gen_ai.response.model', response.model);
        span.setAttribute('gen_ai.response.finish_reasons', [response.finishReason]);
        span.setAttribute('gen_ai.usage.input_tokens', response.usage.inputTokens);
        span.setAttribute('gen_ai.usage.output_tokens', response.usage.outputTokens);
        if (tracer.captureContent) {
          span.setAttribute('gen_ai.output.messages', JSON.stringify([{ role: 'assistant', content: response.text, toolCalls: response.toolCalls }]));
        }
        span.end('ok');
        return response;
      } catch (error) {
        span.setAttribute('error.type', errorType(error));
        span.end('error');
        throw error;
      }
    },
  };
}

export function tracedTool(tool: Tool, tracer: Tracer, { parent }: { parent?: Span } = {}): Tool {
  return {
    ...tool,
    async execute(args, callId) {
      const span = tracer.startSpan(`execute_tool ${tool.name}`, {
        parent,
        kind: 'internal',
        attributes: { 'gen_ai.operation.name': 'execute_tool', 'gen_ai.tool.name': tool.name, 'gen_ai.tool.description': tool.description },
      });
      if (callId !== undefined) span.setAttribute('gen_ai.tool.call.id', callId);
      if (tracer.captureContent) span.setAttribute('gen_ai.tool.call.arguments', JSON.stringify(args));
      try {
        const result = await tool.execute(args, callId);
        if (tracer.captureContent) span.setAttribute('gen_ai.tool.call.result', typeof result === 'string' ? result : JSON.stringify(result));
        span.end('ok');
        return result;
      } catch (error) {
        span.setAttribute('error.type', errorType(error));
        span.end('error');
        throw error;
      }
    },
  };
}

const numberAttribute = (span: Span, key: string) => (typeof span.attributes[key] === 'number' ? (span.attributes[key] as number) : 0);

export function summarizeTrace(spans: Span[], traceId: string, pricing: Record<string, Pricing>): TraceSummary {
  const traceSpans = spans.filter((span) => span.traceId === traceId);
  const modelSpans = traceSpans.filter((span) => span.attributes['gen_ai.operation.name'] === 'chat');
  const unpriced = new Set<string>();
  let costUsd = 0;
  for (const span of modelSpans) {
    const model = String(span.attributes['gen_ai.response.model'] ?? span.attributes['gen_ai.request.model']);
    const price = pricing[model];
    if (!price) {
      unpriced.add(model);
      continue;
    }
    costUsd += (numberAttribute(span, 'gen_ai.usage.input_tokens') * price.inputPerMillion + numberAttribute(span, 'gen_ai.usage.output_tokens') * price.outputPerMillion) / 1_000_000;
  }
  const starts = traceSpans.map((span) => span.startMs);
  const ends = traceSpans.map((span) => span.endMs ?? span.startMs);
  return {
    traceId,
    spans: traceSpans.length,
    modelCalls: modelSpans.length,
    toolCalls: traceSpans.filter((span) => span.attributes['gen_ai.operation.name'] === 'execute_tool').length,
    errors: traceSpans.filter((span) => span.status === 'error').length,
    inputTokens: modelSpans.reduce((sum, span) => sum + numberAttribute(span, 'gen_ai.usage.input_tokens'), 0),
    outputTokens: modelSpans.reduce((sum, span) => sum + numberAttribute(span, 'gen_ai.usage.output_tokens'), 0),
    costUsd,
    durationMs: traceSpans.length === 0 ? 0 : Math.max(...ends) - Math.min(...starts),
    unpricedModels: [...unpriced],
  };
}
