Build the part of an AI gateway that runs before any model is called: a semantic cache that is scoped, so one tenant never receives another tenant's answer, and a `complete` function that serves cache hits and falls back across providers on retryable errors. There is no network and no model here: `embed` and the providers are plain functions that the tests inject.

```ts
interface Scope { tenant: string; model: string; systemPrompt: string }
interface CompletionRequest extends Scope { prompt: string }
interface Provider { name: string; call(request: CompletionRequest): Promise<string> }
interface SemanticCache {
  lookup(scope: string, prompt: string): string | undefined;
  store(scope: string, prompt: string, answer: string): void;
}

export function cosineSimilarity(a: number[], b: number[]): number // already written in the starter
export function scopeKey(scope: Scope): string
export function createSemanticCache(options: { threshold: number; embed: (text: string) => number[] }): SemanticCache
export function createGateway(options: { providers: Provider[]; cache: SemanticCache }): {
  complete(request: CompletionRequest): Promise<{ answer: string; provider: string; cached: boolean }>;
}
```

**`scopeKey({ tenant, model, systemPrompt })`** returns `JSON.stringify([tenant, model, systemPrompt])` and reads no other field, so `scopeKey(request)` works on a whole request. Every field changes the key, and a field that contains a separator such as `|` cannot collide with another combination of fields.

**`createSemanticCache({ threshold, embed })`** starts empty.

- `store(scope, prompt, answer)` calls `embed(prompt)` once and keeps the vector together with the scope and the answer.
- `lookup(scope, prompt)` calls `embed(prompt)` at most once and compares that vector, with `cosineSimilarity`, against the entries stored under **exactly the same `scope` string**, and only those. It returns the answer of the **most similar** entry when its similarity is at least `threshold` (`>=`), otherwise `undefined` (no entry in the scope, or the best one is below the threshold). The first entry stored wins a tie. Stored prompts are never embedded again.

**`createGateway({ providers, cache })`** returns `{ complete }`, where `complete(request)`:

1. Looks up `request.prompt` under `scopeKey(request)`. On a hit it resolves `{ answer, provider: 'cache', cached: true }` without calling any provider.
2. Otherwise calls the providers in order, passing them the request. The first answer is stored in the cache under the same scope and prompt, and `complete` resolves `{ answer, provider: <that provider's name>, cached: false }`.
3. Treats a provider error as **retryable** when its `status` is `429` or from `500` to `599`, or its `name` is `'TimeoutError'`. After a retryable error it moves to the next provider. Any other error (a `400`, a plain `Error`) is rethrown at once, and the remaining providers are not called. When every provider fails with a retryable error, `complete` rejects with the **last** error. A failed request stores nothing.

Matching on prompt similarity alone is not enough: an entry stored for one tenant, model or system prompt must never answer another. In production `embed` is a call to an embedding model and each provider is an HTTP client with a timeout and a circuit breaker; here they are plain functions, so the tests control every result.
