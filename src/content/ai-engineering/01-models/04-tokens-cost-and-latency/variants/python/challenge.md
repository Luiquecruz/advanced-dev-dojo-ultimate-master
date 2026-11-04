Put a budget guard in front of a model: estimate the worst-case cost before each call with a safety margin, refuse calls that could exceed a limit **before** anything is sent, record the actual usage after each call, and measure latency with an injected clock.

Prices are given as a dict `pricing = {"inputPerMillion": ..., "outputPerMillion": ...}` (dollars per million tokens). Count input tokens locally with `count_tokens(messages)` from `dojo_ai`. Like a real local tokenizer, it can undercount: the provider's reported `"usage"` may be higher, which is why the estimate takes a safety margin. Results are dicts with camelCase keys, like the provider's JSON; functions and parameters use Python names.

## 1. `estimate_cost(messages, max_tokens, pricing, safety_margin=0)`

`safety_margin` is a fraction (`0.2` means 20% more). Returns `{"inputTokens", "maxOutputTokens", "maxCost"}`:

- `"inputTokens"` is `count_tokens(messages) × (1 + safety_margin)`, rounded up to a whole token;
- `"maxOutputTokens"` is `max_tokens`;
- `"maxCost"` is the worst case: `(inputTokens × inputPerMillion + max_tokens × outputPerMillion) / 1 000 000`.

## 2. `BudgetExceededError`

An exception with a `scope` attribute: `"request"` or `"session"` (already written).

## 3. `create_budgeted_client(model, pricing, max_request_cost, max_session_cost, safety_margin=0.2, now=system_clock)`

`model` has `await model.generate(request)` (the tests pass `create_model()`), `max_request_cost` and `max_session_cost` are dollars, and `now` is a function returning the current time in milliseconds (default: the system clock). It returns a `BudgetedClient` with two methods.

**`await client.send(messages, max_tokens)`**

1. Estimate the call with `estimate_cost`, using the client's `safety_margin`.
2. If the estimate's `"maxCost"` is greater than `max_request_cost`, raise a `BudgetExceededError` whose `scope` is `"request"`.
3. If the actual cost already spent in this client plus the estimate's `"maxCost"` is greater than `max_session_cost`, raise a `BudgetExceededError` whose `scope` is `"session"`.
4. Otherwise await `model.generate({"messages": messages, "maxTokens": max_tokens})`, reading `now()` right before and right after the call.
5. Add the provider's `"usage"` to the session totals and return `{"text", "usage", "estimatedCost", "latencyMs"}`, where `"estimatedCost"` is the estimate's `"maxCost"` and `"latencyMs"` is the difference between the two clock readings.

A refused call sends nothing to the model and changes no totals.

**`client.report()`** returns the session totals: `{"requests", "inputTokens", "outputTokens", "cost", "latenciesMs"}`, where `"requests"` counts the calls that were sent, the token and cost fields add up the provider's `"usage"` of those calls, and `"latenciesMs"` lists each call's latency in order.

The tests configure the fake model with the same prices they pass to your client, and sometimes with a tokenizer that reports 15% more tokens than `count_tokens`.
