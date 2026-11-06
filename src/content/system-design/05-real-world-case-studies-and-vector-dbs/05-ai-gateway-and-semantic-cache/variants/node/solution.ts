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
  return JSON.stringify([scope.tenant, scope.model, scope.systemPrompt]);
}

export function createSemanticCache(options: { threshold: number; embed: (text: string) => number[] }): SemanticCache {
  const entries: CacheEntry[] = [];

  function lookup(scope: string, prompt: string): string | undefined {
    const candidates = entries.filter((entry) => entry.scope === scope);
    if (candidates.length === 0) {
      return undefined;
    }
    const vector = options.embed(prompt);
    let best: CacheEntry | undefined;
    let bestSimilarity = -Infinity;
    for (const entry of candidates) {
      const similarity = cosineSimilarity(vector, entry.vector);
      if (similarity > bestSimilarity) {
        best = entry;
        bestSimilarity = similarity;
      }
    }
    return best !== undefined && bestSimilarity >= options.threshold ? best.answer : undefined;
  }

  function store(scope: string, prompt: string, answer: string): void {
    entries.push({ scope, vector: options.embed(prompt), answer });
  }

  return { lookup, store };
}

function isRetryable(error: unknown): boolean {
  const { status, name } = (error ?? {}) as { status?: unknown; name?: unknown };
  if (name === 'TimeoutError') {
    return true;
  }
  return typeof status === 'number' && (status === 429 || (status >= 500 && status <= 599));
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
    let lastError: unknown = new Error('no provider configured');
    for (const provider of options.providers) {
      let answer: string;
      try {
        answer = await provider.call(request);
      } catch (error) {
        if (!isRetryable(error)) {
          throw error;
        }
        lastError = error;
        continue;
      }
      options.cache.store(scope, request.prompt, answer);
      return { answer, provider: provider.name, cached: false };
    }
    throw lastError;
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
