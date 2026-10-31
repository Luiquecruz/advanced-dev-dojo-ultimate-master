export type Role = 'system' | 'user' | 'assistant' | 'tool';
export type FinishReason = 'stop' | 'length' | 'tool_calls' | 'refusal' | 'content_filter';
export type ModelErrorCode = 'rate_limit' | 'server_error' | 'overloaded' | 'timeout' | 'context_length' | 'invalid_request';

export interface ToolCall {
  id: string;
  name: string;
  arguments: string;
}

export interface Message {
  role: Role;
  content: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
}

export interface ToolDefinition {
  name: string;
  description?: string;
  parameters?: Record<string, unknown>;
}

export interface GenerateRequest {
  model?: string;
  messages: Message[];
  tools?: ToolDefinition[];
  responseFormat?: { type: 'text' } | { type: 'json'; schema?: Record<string, unknown> };
  maxTokens?: number;
  temperature?: number;
  signal?: AbortSignal;
}

export interface Usage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
}

export interface GenerateResponse {
  id: string;
  model: string;
  text: string;
  toolCalls: ToolCall[];
  finishReason: FinishReason;
  usage: Usage;
}

export type StreamChunk = { type: 'text'; delta: string } | { type: 'tool-call'; toolCall: ToolCall } | { type: 'finish'; finishReason: FinishReason; usage: Usage };

export interface ModelReply {
  text?: string;
  toolCalls?: Array<{ name: string; arguments: string | Record<string, unknown>; id?: string }>;
  finishReason?: FinishReason;
  delayMs?: number;
  error?: { status: number; code: ModelErrorCode; message?: string; retryAfterMs?: number };
}

export interface BehaviorContext {
  request: GenerateRequest;
  callIndex: number;
  random(): number;
  pick<T>(items: readonly T[]): T;
}

export type Behavior = ModelReply | ((context: BehaviorContext) => ModelReply);
export type Handler = (request: GenerateRequest, context: BehaviorContext) => Behavior | undefined;

export interface Pricing {
  inputPerMillion: number;
  outputPerMillion: number;
}

export interface FakeModelConfig {
  model: string;
  contextWindow: number;
  latencyMs: number;
  pricing: Pricing;
}

export interface Cassette {
  model: string;
  recordedAt: string;
  replies: ModelReply[];
}

export type Wait = (ms: number, signal?: AbortSignal) => Promise<void>;

const DEFAULT_CONFIG: FakeModelConfig = {
  model: 'dojo-fake-1',
  contextWindow: 32000,
  latencyMs: 0,
  pricing: { inputPerMillion: 1, outputPerMillion: 4 },
};

const CHARACTERS_PER_TOKEN = 4;
const TOKENS_PER_MESSAGE = 4;
const EMBEDDING_DIMENSIONS = 64;
const STOPWORDS = new Set(['a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'how', 'in', 'is', 'it', 'of', 'on', 'or', 'that', 'the', 'this', 'to', 'was', 'what', 'when', 'where', 'which', 'who', 'why', 'with']);

/**
 * Error raised by the fake model, shaped like provider API errors.
 */
export class ModelError extends Error {
  readonly status: number;
  readonly code: ModelErrorCode;
  readonly retryAfterMs?: number;

  constructor(status: number, code: ModelErrorCode, message: string, retryAfterMs?: number) {
    super(message);
    this.name = 'ModelError';
    this.status = status;
    this.code = code;
    this.retryAfterMs = retryAfterMs;
  }
}

/**
 * Approximate token count of a text: one token per four characters, the usual rule of thumb for English.
 */
export function countTokens(input: string | Message[]): number {
  if (typeof input === 'string') {
    return Math.ceil(input.length / CHARACTERS_PER_TOKEN);
  }
  return input.reduce((total, message) => total + TOKENS_PER_MESSAGE + countTokens(message.content) + countTokens((message.toolCalls ?? []).map((call) => call.name + call.arguments).join('')), 0);
}

function stem(word: string): string {
  return word.replace(/(ing|ed|es|s)$/, '').replace(/(.)\1$/, '$1');
}

function hash(text: string): number {
  let value = 2166136261;
  for (let index = 0; index < text.length; index++) {
    value ^= text.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

function embedOne(text: string, dimensions: number): number[] {
  const vector = new Array<number>(dimensions).fill(0);
  const words = text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  words
    .filter((word) => !STOPWORDS.has(word))
    .map(stem)
    .forEach((word) => {
      const value = hash(word);
      vector[value % dimensions] += value & 1 ? 1 : -1;
    });
  const length = Math.hypot(...vector);
  return length === 0 ? vector : vector.map((component) => component / length);
}

/**
 * Deterministic bag-of-words embedding: texts that share words point in similar directions. A teaching stand-in for an embedding model.
 */
export function embed(text: string, options?: { dimensions?: number }): number[];
export function embed(texts: string[], options?: { dimensions?: number }): number[][];
export function embed(input: string | string[], options: { dimensions?: number } = {}): number[] | number[][] {
  const dimensions = options.dimensions ?? EMBEDDING_DIMENSIONS;
  return Array.isArray(input) ? input.map((text) => embedOne(text, dimensions)) : embedOne(input, dimensions);
}

/**
 * Cosine similarity of two vectors of the same length, from -1 to 1.
 */
export function cosineSimilarity(left: number[], right: number[]): number {
  if (left.length !== right.length) {
    throw new Error(`Vectors have different lengths: ${left.length} and ${right.length}`);
  }
  const dot = left.reduce((total, value, index) => total + value * right[index], 0);
  const norms = Math.hypot(...left) * Math.hypot(...right);
  return norms === 0 ? 0 : dot / norms;
}

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function breakJson(json: string, random: () => number): string {
  const forms = [
    () => json.slice(0, Math.max(1, Math.floor(json.length * 0.6))),
    () => json.replace(/}$/, ',}'),
    () => `Sure! Here is the JSON you asked for:\n\`\`\`json\n${json}\n\`\`\``,
    () => json.replace(/"/g, "'"),
  ];
  return forms[Math.floor(random() * forms.length)]();
}

/**
 * Builders for the behaviors every model generation shows, used to script the fake model.
 */
export const respond = {
  text(text: string | readonly string[]): Behavior {
    return (context) => ({ text: typeof text === 'string' ? text : context.pick(text) });
  },
  json(value: unknown): Behavior {
    return { text: JSON.stringify(value) };
  },
  malformedJson(value: unknown = { answer: 'ok' }): Behavior {
    return (context) => ({ text: breakJson(JSON.stringify(value), context.random) });
  },
  toolCall(name: string, args: Record<string, unknown> = {}): Behavior {
    return { toolCalls: [{ name, arguments: args }] };
  },
  toolCalls(calls: Array<{ name: string; arguments?: Record<string, unknown> }>): Behavior {
    return { toolCalls: calls.map((call) => ({ name: call.name, arguments: call.arguments ?? {} })) };
  },
  invalidToolArguments(name: string): Behavior {
    return { toolCalls: [{ name, arguments: '{"query": ' }] };
  },
  unknownTool(name = 'delete_everything'): Behavior {
    return { toolCalls: [{ name, arguments: {} }] };
  },
  refusal(text = "I can't help with that request."): Behavior {
    return { text, finishReason: 'refusal' };
  },
  truncated(text: string, keepRatio = 0.5): Behavior {
    return { text: text.slice(0, Math.max(1, Math.floor(text.length * keepRatio))), finishReason: 'length' };
  },
  error(status: 429 | 500 | 503 | 504, options: { retryAfterMs?: number; message?: string } = {}): Behavior {
    const code: ModelErrorCode = status === 429 ? 'rate_limit' : status === 503 ? 'overloaded' : status === 504 ? 'timeout' : 'server_error';
    return { error: { status, code, message: options.message ?? `Model request failed with status ${status}`, retryAfterMs: options.retryAfterMs } };
  },
  slow(delayMs: number, behavior: Behavior): Behavior {
    return (context) => ({ ...resolveBehavior(behavior, context), delayMs });
  },
  oneOf(behaviors: readonly Behavior[]): Behavior {
    return (context) => resolveBehavior(context.pick(behaviors), context);
  },
  sometimes(probability: number, behavior: Behavior, otherwise: Behavior): Behavior {
    return (context) => resolveBehavior(context.random() < probability ? behavior : otherwise, context);
  },
};

function resolveBehavior(behavior: Behavior, context: BehaviorContext): ModelReply {
  return typeof behavior === 'function' ? behavior(context) : behavior;
}

function defaultReply(request: GenerateRequest): ModelReply {
  if (request.responseFormat?.type === 'json') {
    return { text: '{}' };
  }
  const lastUser = [...request.messages].reverse().find((message) => message.role === 'user');
  const excerpt = (lastUser?.content ?? '').slice(0, 80);
  return { text: `(dojo-fake-1) No scripted reply for this request. Last user message: "${excerpt}"` };
}

/**
 * One fake model provider instance: the learner-facing module (`@dojo/ai`), the control surface for tests and demos (`@dojo/ai/testing`) and a reset hook.
 */
export function createFakeModelProvider({ wait }: { wait: Wait }) {
  let config: FakeModelConfig = { ...DEFAULT_CONFIG };
  let queue: Behavior[] = [];
  let handler: Handler | undefined;
  let random = seededRandom(1);
  let requests: GenerateRequest[] = [];
  let responseCount = 0;
  let toolCallCount = 0;

  const context = (request: GenerateRequest): BehaviorContext => ({
    request,
    callIndex: requests.length - 1,
    random,
    pick: (items) => items[Math.floor(random() * items.length)],
  });

  const respondTo = async (request: GenerateRequest): Promise<GenerateResponse> => {
    requests.push({ ...request, messages: request.messages.map((message) => ({ ...message })) });
    const inputTokens = countTokens(request.messages);
    if (inputTokens > config.contextWindow) {
      throw new ModelError(400, 'context_length', `Input has ${inputTokens} tokens, above the ${config.contextWindow}-token context window`);
    }
    const behaviorContext = context(request);
    const behavior = queue.shift() ?? handler?.(request, behaviorContext) ?? defaultReply(request);
    const reply = resolveBehavior(behavior, behaviorContext);
    const delayMs = reply.delayMs ?? config.latencyMs;
    if (delayMs > 0) {
      await wait(delayMs, request.signal);
    }
    if (request.signal?.aborted) {
      throw request.signal.reason ?? new DOMException('The operation was aborted', 'AbortError');
    }
    if (reply.error) {
      throw new ModelError(reply.error.status, reply.error.code, reply.error.message ?? `Model request failed with status ${reply.error.status}`, reply.error.retryAfterMs);
    }
    let text = reply.text ?? '';
    let toolCalls: ToolCall[] = (reply.toolCalls ?? []).map((call) => ({
      id: call.id ?? `call_${++toolCallCount}`,
      name: call.name,
      arguments: typeof call.arguments === 'string' ? call.arguments : JSON.stringify(call.arguments),
    }));
    let finishReason: FinishReason = reply.finishReason ?? (toolCalls.length > 0 ? 'tool_calls' : 'stop');
    let outputTokens = countTokens(text) + countTokens(toolCalls.map((call) => call.name + call.arguments).join(''));
    if (request.maxTokens !== undefined && outputTokens > request.maxTokens) {
      text = text.slice(0, request.maxTokens * CHARACTERS_PER_TOKEN);
      toolCalls = [];
      finishReason = 'length';
      outputTokens = request.maxTokens;
    }
    const cost = (inputTokens * config.pricing.inputPerMillion + outputTokens * config.pricing.outputPerMillion) / 1_000_000;
    return {
      id: `resp_${++responseCount}`,
      model: request.model ?? config.model,
      text,
      toolCalls,
      finishReason,
      usage: { inputTokens, outputTokens, totalTokens: inputTokens + outputTokens, cost: Math.round(cost * 1e9) / 1e9 },
    };
  };

  const createModel = (options: { model?: string } = {}) => ({
    get name() {
      return options.model ?? config.model;
    },
    get contextWindow() {
      return config.contextWindow;
    },
    generate(request: GenerateRequest): Promise<GenerateResponse> {
      return respondTo({ ...request, model: request.model ?? options.model });
    },
    async *stream(request: GenerateRequest): AsyncGenerator<StreamChunk> {
      const response = await respondTo({ ...request, model: request.model ?? options.model });
      for (const delta of response.text.match(/\S+\s*|\s+/g) ?? []) {
        yield { type: 'text', delta };
      }
      for (const toolCall of response.toolCalls) {
        yield { type: 'tool-call', toolCall };
      }
      yield { type: 'finish', finishReason: response.finishReason, usage: response.usage };
    },
  });

  const fakeModel = {
    reply(...behaviors: Behavior[]) {
      queue.push(...behaviors);
      return fakeModel;
    },
    handle(next: Handler) {
      handler = next;
      return fakeModel;
    },
    seed(value: number) {
      random = seededRandom(value);
      return fakeModel;
    },
    configure(next: Partial<FakeModelConfig>) {
      config = { ...config, ...next, pricing: { ...config.pricing, ...next.pricing } };
      return fakeModel;
    },
    replay(cassette: Cassette) {
      config = { ...config, model: cassette.model };
      queue.push(...cassette.replies);
      return fakeModel;
    },
    get requests(): readonly GenerateRequest[] {
      return requests;
    },
    get pending(): number {
      return queue.length;
    },
    reset() {
      config = { ...DEFAULT_CONFIG };
      queue = [];
      handler = undefined;
      random = seededRandom(1);
      requests = [];
      responseCount = 0;
      toolCallCount = 0;
      return fakeModel;
    },
  };

  const forEachSeed = async (count: number, run: (seed: number) => unknown | Promise<unknown>): Promise<void> => {
    for (let seed = 1; seed <= count; seed++) {
      fakeModel.reset().seed(seed);
      try {
        await run(seed);
      } catch (error) {
        throw new Error(`Failed with seed ${seed}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  };

  return {
    module: { createModel, embed, cosineSimilarity, countTokens, ModelError },
    testing: { fakeModel, respond, forEachSeed },
    reset: () => fakeModel.reset(),
  };
}

export type FakeModelProvider = ReturnType<typeof createFakeModelProvider>;
