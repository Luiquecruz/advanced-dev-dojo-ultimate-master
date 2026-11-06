# Caching and Batching

Two features change the cost of the same prompts by large factors without changing a word of them: **prompt caching**, which makes repeated prefixes cheap and fast, and **batch APIs**, which trade latency for price. A third technique with a similar name, **semantic caching**, works differently and carries real risks.

## Prompt caching: pay once for a stable prefix

Before generating, the model processes the whole input (the prefill). When many requests start with the same tokens (a long system prompt, tool definitions, a few-shot block, a document the user keeps asking about), the provider can store the processed state of that **prefix** and reuse it. Cached input tokens are billed at a fraction of the normal price and the time to first token drops, often substantially for long prefixes.

The rule that governs everything: **the cache matches an exact prefix**. One changed token invalidates the cache from that point onward. So prompt structure becomes a cost decision:

```
[tools] [system prompt] [static examples] [long reference document]   <- stable: cacheable
[conversation history] [retrieved chunks] [today's date] [question]   <- varies: after the prefix
```

- Put stable content first and anything that varies per request or per user last.
- Never put a timestamp, a request id or the user's name at the top of the system prompt: it makes every prefix unique.
- Keep tool definitions and their order stable; many providers place tools at the very start of the prefix.
- Selected examples (lesson 04) and retrieved chunks vary per request; place them after the stable part.
- In conversations, the history is a growing prefix: each turn can reuse the previous turn's cache.

Providers implement it in two styles. **Automatic** caching applies to any request whose prefix is long enough and was seen recently. **Explicit** caching lets you mark breakpoints (or create cache objects) and sometimes choose a longer lifetime; writes may cost more than a normal input token, so caching pays off only when a prefix is reused. Caches expire after minutes of inactivity unless you pay for longer retention, and very short prompts are not cached at all. Measure the result: providers report cached tokens in the usage record, and your cost dashboards should show the **cache hit rate**.

## Batch APIs: when nobody is waiting

Many workloads have no user waiting: nightly classification of yesterday's tickets, embedding a document collection, running an eval suite, backfilling summaries. **Batch APIs** accept a file or list of requests, process them asynchronously within a window (commonly up to 24 hours, often much faster) and charge a substantial discount over the interactive price. They also have separate, higher throughput limits, so a big job does not consume the quota of your live traffic.

The trade-offs: results arrive later and in arbitrary order (match them by your own request id), individual requests can fail or expire and must be retried, and you need a job to submit, poll and collect. Batch discounts and prompt caching can often be combined, though cache hits inside a batch are best-effort.

## Semantic caching: reusing answers, not prefixes

A **semantic cache** stores past questions and answers, embeds each new question, and returns a stored answer when a past question is similar enough, skipping the model entirely. It can cut cost and latency for repetitive traffic (FAQ-style support), but it is a different kind of system with different risks:

- **False hits.** "How do I cancel my order?" and "How do I cancel my subscription?" are close in embedding space and need different answers. A threshold loose enough to hit often is loose enough to be wrong.
- **Staleness.** A cached answer outlives the policy, price or stock level it described.
- **Leaks across users and permissions.** An answer computed from one user's data or one tenant's documents must never be served to another. The cache key must include everything that shaped the answer: user or tenant, permissions, prompt version, model version, retrieved sources.
- **Harder debugging**: the "model's answer" may be weeks old.

Exact-match caching of deterministic calls (same prompt version, same inputs, temperature 0 for a classification) is a safer middle ground: no similarity threshold, and a key that is easy to scope.

## Pitfalls

- A per-request value at the start of the prompt, so the cache never hits.
- Reordering tools or examples between requests.
- Interactive endpoints for bulk offline work, paying full price and fighting rate limits.
- Batch results matched by position instead of by id.
- Semantic caching of answers that depend on the user, permissions or fresh data.

Providers differ in how caching works: some cache a stable prefix automatically, others need explicit breakpoints, and each sets a minimum prefix length, a cache lifetime, a write price and a discounted read price. Batch interfaces typically charge about half the interactive price in exchange for results within a day. Check your provider's price page before relying on any number.

## When to choose it

Design every prompt with a stable prefix from the start: it costs nothing and makes caching possible when traffic grows. Turn on explicit caching when a long prefix (over a thousand tokens or so) is reused many times within minutes, and confirm the hit rate in usage data. Send any workload that can wait hours (evals, backfills, bulk extraction, nightly jobs) through a batch API. Use exact-match caching for deterministic, unscoped calls; consider semantic caching only for public, non-personalized, slow-changing answers, with a conservative threshold, keys scoped by version and tenant, expiry, and evals that measure false hits.
