# AI Gateway & Semantic Cache

When every application calls model providers directly, each one stores provider keys, retries in its own way and logs in its own format, and nobody can say which team spent the tokens. An **AI gateway** is the shared layer between applications and model providers: a layer 7 proxy, like an API gateway, that authenticates callers, meters tokens, routes requests, falls back when a provider fails, streams answers, caches them and records every request. This lesson designs one, focusing on its riskiest part: a semantic cache that reuses answers by meaning without leaking them between tenants, the customers or teams that share the gateway.

You need: Rate Limiting Algorithms (token bucket, `429` with `Retry-After`), Network Protocols: HTTP Versions, gRPC, WebSockets & SSE (Server-Sent Events), Caching Patterns & Stampede Mitigation (cache-aside, hit rate), Resilience: Circuit Breakers, Retries & Bulkheads (retryable errors, backoff with jitter, circuit breakers) and Vector Databases & ANN Indexes (embeddings, cosine similarity).

## The request path

Applications send one provider-neutral request (credentials, model or alias, messages, parameters); only the gateway holds provider keys, so rotating a key or adding a provider is one change. Every request passes the same stages:

```text
authenticate → token quota → cache lookup ──hit──→ answer
                                  │ miss
                                  ▼
               route → provider A ──429 / 5xx / timeout──→ provider B
                                  │
               stream to the client → count tokens → store in cache → log
```

## Quotas in tokens, not requests

Providers limit and bill by tokens, and one request can carry 50 tokens while another carries 50,000, so "100 requests per minute" says nothing about cost. The gateway meters each tenant in tokens with a token bucket: the capacity is the burst a tenant may spend at once, the refill rate its tokens per minute.

Output tokens are unknown until the answer ends. A safe design **reserves** before the call: the input tokens plus the request's maximum output tokens leave the bucket, or the gateway answers `429` with `Retry-After` when they do not fit. When the response ends, it **reconciles** with the usage the provider reports and returns the unused part. A cheaper design checks only input tokens up front and accepts that concurrent requests can overshoot the limit until their usage arrives. A monthly token budget per team usually sits on top.

## Routing and fallback

Applications ask for an alias such as `support-chat`, which the gateway maps to a concrete model by capability first (tool calling, image input, context length), then by cost and latency. Swapping the model behind an alias becomes a configuration change.

The resilience tools apply per provider:

- **Fall back only on retryable errors**: `429` (your quota at that provider is exhausted), `5xx` and timeouts. A `400` describes a malformed request, fails the same way at every provider and only multiplies cost.
- Retry with capped backoff and jitter, honoring `Retry-After`, or move to the next provider of the route.
- Give each provider its own **circuit breaker**, so a provider that is down is skipped at once instead of costing a timeout per request, and its own concurrency limit (a bulkhead).

## Streaming through the gateway

Models generate tokens one by one, and users judge speed by the time to the first token. The gateway relays the provider's stream as Server-Sent Events, chunk by chunk, instead of buffering the whole answer. Fallback is only safe before the first chunk reaches the client; after that, a failure becomes an error event, because switching providers would splice two different answers together. Usage is reconciled when the stream ends, even when the client disconnects early, and only a complete answer is stored in the cache.

## Exact-match and semantic caching

An **exact-match cache** keys each answer by a hash of everything that shapes it: tenant, model, parameters, system prompt, tool definitions and messages. It hits only on identical requests: safe, but rare on free-form text, and worth it for templated and repeated prompts.

A **semantic cache** embeds the prompt, searches the stored prompts for the nearest neighbor and, when the cosine similarity reaches a **threshold**, returns the stored answer: "How do I reset my password?" and "password reset steps" share one entry. Each lookup costs an embedding call and a vector search, far less than a generation, but paid on every miss too.

## Scope, conversations and the threshold

Similarity compares prompts only. Everything else that shapes the answer must **partition** the cache exactly: tenant (or user, for personal data), model, system prompt, tool definitions, temperature and response format. Build a scope key from those fields and search only inside it. Without a scope, one tenant's answer, with its data and its system prompt's rules, is served to another. The scope also invalidates old answers for free: a new system prompt is a new scope.

Multi-turn and personalized traffic does not fit. In a conversation, "and in French?" depends on every earlier turn, so a cache keyed by the last message matches unrelated conversations. Cache standalone prompts only, and never share answers built from one user's data.

The threshold is a trade-off. A lower one raises the hit rate and the **false hits**: confident answers to a different question, typically where embeddings blur negation and numbers ("cancel my order" vs "do not cancel my order"). A higher one serves fewer wrong answers and saves less. Tune it on labeled pairs of real prompts, give entries a TTL, and check whether a product expresses the threshold as a minimum similarity or as a maximum distance, where lower is stricter.

## Observability per request

Record one structured event per request: tenant, alias and concrete model, provider, input and output tokens, cache outcome (exact hit, semantic hit with its similarity, miss), time to first token, total latency, fallback steps and error type. **OpenTelemetry**, the vendor-neutral standard for metrics, logs and traces (the path of one request across services), names these fields in its semantic conventions for generative AI, such as `gen_ai.request.model`, `gen_ai.usage.input_tokens` and `gen_ai.usage.output_tokens`, so gateway and application records line up. Prompts often contain personal data: log them only under an explicit retention policy.

## Common mistakes

- **A semantic cache keyed only by prompt similarity**, ignoring tenant, model and system prompt. Two tenants asking the same question share one answer, so the second receives the first one's data. Partition by every field that shapes the answer and compare prompts only inside one scope.
- **Quotas counted in requests.** One request can cost a thousand times more tokens than another; meter tokens, reserve before the call and reconcile after it.
- **Falling back on every error.** A `400` fails at every provider; fall back on `429`, `5xx` and timeouts, and never after the first streamed chunk.
- **Semantic caching of follow-up turns** keyed by the last message of a conversation.

## In practice

Start thin: authentication, token metering per tenant, one route with a fallback provider and one log record per request. Add an exact-match cache for templated and repeated prompts. Add a semantic cache only for standalone, non-personal prompts, scoped by tenant, model, system prompt and tools, with a tuned threshold and a TTL, and watch its false-hit rate next to its hit rate.

## Check yourself

1. Two tenants ask "What is your refund policy?" through a semantic cache keyed only by prompt similarity. What goes wrong, and what belongs in the scope?
2. Why does a gateway meter tokens instead of requests, and why is the cost of a request unknown before the answer ends?
3. A provider fails with `503` after half an answer was streamed. Why can the gateway not switch to another provider?
4. What happens to the hit rate and to false hits when the similarity threshold is raised?
