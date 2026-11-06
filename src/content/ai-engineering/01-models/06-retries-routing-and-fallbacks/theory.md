# Retries, Routing and Fallbacks

Model APIs fail more often than the services you are used to: rate limits, overloads at peak hours, timeouts on long generations. And a call can *succeed* and still return an answer you cannot use. Production code needs three answers to "what if this call fails?": try again, try a stronger model, or try another provider.

## Know which failures are worth retrying

| Failure | Status | Retry? | Why |
| --- | --- | --- | --- |
| Rate limit | `429` | Yes, after `retry-after` | You were too fast for your quota; the provider says when to come back |
| Server error | `500` | Yes | Often a transient fault on one replica |
| Overloaded | `503` (some providers use `529`) | Yes, with backoff | Capacity is short right now |
| Timeout | `504` | Yes, carefully | Long outputs may time out again; consider a lower `maxTokens` |
| Context too long | `400` | **Never** | The same input fails the same way; trim it or use a model with a larger window |
| Invalid request, auth | `400`, `401`, `403` | Never | A bug or a configuration problem |

Retrying a deterministic error only multiplies cost and latency. Classify errors once, in one function, and let every caller reuse it.

## Backoff, jitter and the server's hint

The Node.js track covered the mechanics: exponential backoff (`base × 2^attempt`, capped) with **full jitter** (a random delay between zero and that value), so a thousand clients that failed together do not retry together. Model APIs add one rule: when the error carries a **retry-after** hint (an HTTP header on `429` and `503`), use it. The provider knows when your quota refills; your formula only guesses.

```ts
const delay = error.retryAfterMs ?? random() * Math.min(maxMs, baseMs * 2 ** attempt);
```

Keep the attempt limit small (two or three retries) and inject `sleep` and `random` so tests run instantly. A model call has no side effects of its own, so repeating it is safe, but every retry is paid for and adds latency.

## Routing: cheap first, escalate on evidence

Most requests in a product are easy. A classification, an extraction or a short reply often works fine on a small, fast, cheap model. A **cascade** sends every request to the cheap model first and **escalates** to a stronger, slower, pricier model only when the cheap answer fails a check:

- the output does not parse or does not match the schema;
- a validator rejects it (an unknown category, a missing citation, a failing test);
- the model reports low confidence or refuses.

The check must be mechanical. "Escalate when the answer seems weak" is not a rule; "escalate when the JSON does not parse or the category is not in the list" is. A good cascade cuts cost substantially while keeping quality, and the escalation rate becomes a metric to watch: if it climbs to 60%, the cheap tier is no longer cheap.

Alternatives pick the tier up front (a classifier, rules by feature or input length). Start with the cascade; it needs no training data.

## Fallbacks: a second failure domain

When a provider has an outage, retrying it is pointless. A **fallback** sends the request to a different provider (or a self-hosted model) after the retries are exhausted. Rules that keep fallbacks honest:

- Fall back on **availability** failures (exhausted retries on `429`, `5xx`), not on bad requests: a `400` will fail everywhere.
- The fallback must be a different **failure domain**: another provider or region, not another model behind the same outage.
- Prompts are not perfectly portable. Run your evals (module 10) on the fallback model too, and decide what quality drop is acceptable during an outage.
- Pin model **versions** for primary and fallback, and track their deprecation dates; an alias such as `-latest` changes behavior without a deploy.

For outages that last minutes, a **circuit breaker** stops sending traffic to the failing provider for a while instead of paying the retry delay on every request.

## Pitfalls

- Retrying every error, including `400 context_length`.
- Ignoring `retry-after` and hammering a rate-limited quota.
- Retries at several layers (SDK, gateway, your code) multiplying each other.
- Escalating on subjective judgment instead of a validator.
- A fallback that shares the primary's provider, region or quota.

Official SDKs often retry some errors by default, so check what yours does before adding a second retry layer. Providers signal overload and rate limits with distinct status codes, and many send a `retry-after` header. Gateways can provide fallback and load balancing as configuration instead of code.

## When to choose it

Add classified retries with backoff and retry-after to every production model call; it is cheap insurance. Add a cheap-first cascade when traffic is high, most requests are easy and you have a mechanical validator for the answer; skip it when every request is hard or when you cannot tell a good answer from a bad one automatically (build the evals first). Add a cross-provider fallback when the feature is user-facing and an outage costs more than maintaining prompts and evals for a second model; for internal or batch work, queueing and retrying later is often enough.
