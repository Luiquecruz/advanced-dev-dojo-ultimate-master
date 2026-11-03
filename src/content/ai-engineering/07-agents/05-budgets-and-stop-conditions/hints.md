For `callSignature`, write a recursive `canonical(value)` that rebuilds objects with `Object.keys(value).sort()` and maps arrays element by element, then return `` `${name}:${JSON.stringify(canonical(JSON.parse(args)))}` `` inside a `try`, and `` `${name}:${args}` `` in the `catch`.
---
Keep a `usage` object with all five totals and a small `finish(reason, detail, answer = null)` helper that builds the result with `elapsedMs: now() - startedAt`. Then every exit is one line, and the totals can never be forgotten in one of them.
---
Use `while (true)` and put the two "before" checks at the top: `usage.steps >= budget.maxSteps` and `budget.maxDurationMs !== undefined && now() - startedAt >= budget.maxDurationMs`. After the call, update totals and push the assistant turn, then check refusal, final answer, tokens and cost in that order, all before the tool loop.
---
Stuck detection needs two variables outside the loop: `lastSignature` and `repeats`. For each tool call, `repeats = signature === lastSignature ? repeats + 1 : 1`, then `lastSignature = signature`; if `repeats >= repeatLimit`, finish with `stuck` before executing that call.
