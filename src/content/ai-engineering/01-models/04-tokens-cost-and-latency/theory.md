# Tokens, Cost and Latency

A model call is a metered call. You pay per token, you wait per token, and a single careless loop can spend a month's budget in an afternoon. The good news: both cost and latency are predictable enough to measure **before** a call and enforce **around** it.

## What you pay for

Providers bill **input tokens** (everything you send) and **output tokens** (everything generated), each at a price per million tokens. Output is usually several times more expensive than input.

Input is more than the user's question. Every call resends:

- the system prompt and few-shot examples;
- the whole conversation history (the model is stateless);
- tool definitions (module 03) and tool results;
- retrieved documents (module 04).

A chat that resends a 3 000-token history on every turn pays for those tokens on every turn. Reasoning models add **reasoning tokens**: hidden output the model generates before answering, billed as output.

```ts
const cost = (inputTokens * pricing.inputPerMillion + outputTokens * pricing.outputPerMillion) / 1_000_000;
```

## Estimate before, measure after

You know the input before the call: count it. Tokenizers are model-specific, so a local count is an **estimate**: a rule of thumb (about four characters per token in English, more for code and non-English text) or a library tokenizer for another model family can be off by 10–30% for your model. The provider's token-counting endpoint is exact but costs a round trip.

So budget with a **safety margin**: inflate the input estimate by the error you have measured (compare your counts with reported `usage` on real traffic) and round up.

You do not know the output length, but you set its ceiling with `maxTokens`, and the provider enforces it exactly. Together that gives a **worst-case cost**:

```ts
const inputTokens = Math.ceil(countTokens(messages) * (1 + safetyMargin));
const maxCost = (inputTokens * pricing.inputPerMillion + maxTokens * pricing.outputPerMillion) / 1_000_000;
```

A margin too small lets requests slip past the budget; a margin too large refuses requests that would have fit. Measure the drift, then pick the margin.

After the call, the provider's `usage` tells you what actually happened. Two numbers, two jobs: the estimate decides whether to send; the usage is what you record, bill and alert on. Never record the estimate as spend, and never trust your own token count over the provider's.

## Budgets

A budget is a limit checked **before** the request leaves your process. Once the request is sent, the money is spent.

| Scope | Protects against |
| --- | --- |
| Per request | a giant prompt (a whole file pasted in, a runaway history) |
| Per session or task | an agent loop that never stops (module 07) |
| Per user, per day | abuse and one customer consuming everyone's quota |
| Per feature, per month | the invoice (module 13, cost governance) |

Check the worst case, not the average: a session with $0.10 left should not send a request that could cost $0.15. When a request does not fit, you have options before refusing outright: **trim** it (drop old history, summarize, lower `maxTokens`), **route** it to a cheaper model (lesson 06), or fail with a clear, typed error the caller can show.

## Latency

A call's latency has three parts:

1. **Overhead**: network, queueing at the provider, your own middleware.
2. **Prefill**: the model reads the input. It grows with input length and determines **time to first token**.
3. **Decode**: the model generates output one token at a time. For most calls this dominates: twice the output is roughly twice the wait.

So the cheapest latency fix is usually fewer output tokens: ask for a label instead of a paragraph, a JSON field instead of an explanation. Smaller models decode faster; reasoning models think before the first visible token.

Measure latency per call with a clock you can inject (`now()` before and after), and report percentiles (p50, p95), not averages: users remember the slow calls. Injecting the clock is what makes latency logic testable without waiting.

## Pitfalls

- Counting only the user message and forgetting history, tools and documents.
- Budgets checked after the call, or against the average reply instead of `maxTokens`.
- Treating a local token count as exact: without a margin, the estimate undercounts whenever the model's tokenizer differs.
- Recording estimated cost as actual spend, or the reverse.
- No `maxTokens` at all, so one request can produce thousands of tokens.
- Latency SLOs on averages, hiding a slow p95.

> **Status as of October 2026:** list prices span roughly two orders of magnitude, from a few cents per million input tokens for small models to tens of dollars per million output tokens for the largest frontier and reasoning models; output usually costs 3–5× input. Most providers discount cached input (prompt caching) and batch jobs (often around 50%). Several providers offer token-counting endpoints; open tokenizers such as `tiktoken` exist for some model families.

## When to choose it

Put a cost estimate and a per-request limit in front of every model call that takes user-controlled input, and a session budget in front of every loop or agent. Track actual usage from day one, per feature, even in prototypes: retrofitting cost attribution is painful. Trim before you refuse when the task can survive a shorter context; refuse with a clear error when it cannot. Skip fine-grained budgets only for offline jobs with a fixed, reviewed input set, and even there keep a global ceiling.
