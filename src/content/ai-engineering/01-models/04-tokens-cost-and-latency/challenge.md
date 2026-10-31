Put a budget guard in front of a model: estimate the worst-case cost before each call with a safety margin, refuse calls that could exceed a limit **before** anything is sent, record the actual usage after each call, and measure latency with an injected clock.

Prices are given as `pricing = { inputPerMillion, outputPerMillion }` (dollars per million tokens). Count input tokens locally with `countTokens(messages)` from `@dojo/ai`. Like a real local tokenizer, it can undercount: the provider's reported `usage` may be higher, which is why the estimate takes a safety margin.

## 1. `estimateCost(messages, maxTokens, pricing, safetyMargin)`

`safetyMargin` is a fraction (`0.2` means 20% more) and defaults to `0`. Returns `{ inputTokens, maxOutputTokens, maxCost }`:

- `inputTokens` is `countTokens(messages) × (1 + safetyMargin)`, rounded up to a whole token;
- `maxOutputTokens` is `maxTokens`;
- `maxCost` is the worst case: `(inputTokens × inputPerMillion + maxTokens × outputPerMillion) / 1 000 000`.

## 2. `BudgetExceededError`

An error type with a `scope` field: `'request'` or `'session'`.

## 3. `createBudgetedClient(options)`

`options` has `model` (a model with `generate(request)`, the tests pass `createModel()`), `pricing`, `maxRequestCost` and `maxSessionCost` (dollars), an optional `safetyMargin` (default `0.2`) and an optional `now` (a function returning the current time in milliseconds; default: the system clock).

It returns a client with two operations.

**`send(messages, maxTokens)`**

1. Estimate the call with `estimateCost`, using the client's `safetyMargin`.
2. If the estimate's `maxCost` is greater than `maxRequestCost`, fail with a `BudgetExceededError` whose `scope` is `'request'`.
3. If the actual cost already spent in this client plus the estimate's `maxCost` is greater than `maxSessionCost`, fail with a `BudgetExceededError` whose `scope` is `'session'`.
4. Otherwise call `model.generate({ messages, maxTokens })`, reading `now()` right before and right after the call.
5. Add the provider's `usage` to the session totals and return `{ text, usage, estimatedCost, latencyMs }`, where `estimatedCost` is the estimate's `maxCost` and `latencyMs` is the difference between the two clock readings.

A refused call sends nothing to the model and changes no totals.

**`report()`** returns the session totals: `{ requests, inputTokens, outputTokens, cost, latenciesMs }`, where `requests` counts the calls that were sent, the token and cost fields add up the provider's `usage` of those calls, and `latenciesMs` lists each call's latency in order.

The tests configure the fake model with the same prices they pass to your client, and sometimes with a tokenizer that reports 15% more tokens than `countTokens`.
