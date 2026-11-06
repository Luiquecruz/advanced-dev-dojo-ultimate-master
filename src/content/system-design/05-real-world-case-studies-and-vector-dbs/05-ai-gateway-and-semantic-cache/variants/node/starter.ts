export interface Scope {
  tenant: string;
  model: string;
  systemPrompt: string;
}

export interface CompletionRequest extends Scope {
  prompt: string;
}

export interface Provider {
  name: string;
  call(request: CompletionRequest): Promise<string>;
}

export interface Completion {
  answer: string;
  provider: string;
  cached: boolean;
}

export interface SemanticCache {
  lookup(scope: string, prompt: string): string | undefined;
  store(scope: string, prompt: string, answer: string): void;
}

interface CacheEntry {
  scope: string;
  vector: number[];
  answer: string;
}

const dot = (a: number[], b: number[]) => a.reduce((sum, value, index) => sum + value * b[index], 0);

export function cosineSimilarity(a: number[], b: number[]): number {
  const lengths = Math.sqrt(dot(a, a)) * Math.sqrt(dot(b, b));
  return lengths === 0 ? 0 : dot(a, b) / lengths;
}

export function scopeKey(scope: Scope): string {
  // TODO: encode tenant, model and system prompt as JSON.stringify([tenant, model, systemPrompt])
  return scope.tenant;
}

export function createSemanticCache(options: { threshold: number; embed: (text: string) => number[] }): SemanticCache {
  const entries: CacheEntry[] = [];

  function lookup(scope: string, prompt: string): string | undefined {
    const vector = options.embed(prompt);
    // TODO: compare only the entries stored under the same scope, and return the most similar one, not the first above the threshold
    const match = entries.find((entry) => cosineSimilarity(vector, entry.vector) >= options.threshold);
    return match?.answer;
  }

  function store(scope: string, prompt: string, answer: string): void {
    entries.push({ scope, vector: options.embed(prompt), answer });
  }

  return { lookup, store };
}

function isRetryable(error: unknown): boolean {
  // TODO: a status of 429 or 500-599, or the name 'TimeoutError', is retryable
  return false;
}

export function createGateway(options: { providers: Provider[]; cache: SemanticCache }): {
  complete(request: CompletionRequest): Promise<Completion>;
} {
  async function complete(request: CompletionRequest): Promise<Completion> {
    const scope = scopeKey(request);
    const hit = options.cache.lookup(scope, request.prompt);
    if (hit !== undefined) {
      return { answer: hit, provider: 'cache', cached: true };
    }
    // TODO: try the providers in order: move on after a retryable error (isRetryable), rethrow any other error at once,
    // and reject with the last error when every provider failed
    const provider = options.providers[0];
    const answer = await provider.call(request);
    options.cache.store(scope, request.prompt, answer);
    return { answer, provider: provider.name, cached: false };
  }

  return { complete };
}

const demoVocabulary = ['reset', 'password', 'refund', 'order'];
const demoEmbed = (text: string) => {
  const words = text.toLowerCase().match(/[a-z]+/g) ?? [];
  return demoVocabulary.map((term) => words.filter((word) => word === term).length);
};

async function main() {
  const gateway = createGateway({
    cache: createSemanticCache({ threshold: 0.8, embed: demoEmbed }),
    providers: [
      { name: 'primary', call: async () => Promise.reject(Object.assign(new Error('overloaded'), { status: 503 })) },
      { name: 'secondary', call: async (request) => `secondary answers: ${request.prompt}` },
    ],
  });
  const request = { tenant: 'acme', model: 'small', systemPrompt: 'You are the Acme support assistant.', prompt: 'How do I reset my password?' };
  console.log(await gateway.complete(request));
  console.log(await gateway.complete({ ...request, prompt: 'password reset, please' }));
  console.log(await gateway.complete({ ...request, tenant: 'globex' }));
}

main().catch((error) => console.log('request failed:', error.message));
