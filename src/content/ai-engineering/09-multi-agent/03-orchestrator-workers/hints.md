`parsePlan` is defensive parsing from module 02: slice from `text.indexOf('{')` to `text.lastIndexOf('}')`, wrap `JSON.parse` in `try`, then check `Array.isArray(subtasks)`, the length, every field and a `Set` of ids. Any problem returns `null`; only then `slice(0, maxSubtasks)`.
---
For `runWithConcurrency`, start `Math.min(limit, items.length)` async "lanes". Each lane loops while a shared `next` index is below `items.length`, takes `const index = next++`, awaits `run(items[index], index)` and stores the result at `results[index]`. `Promise.all` over the lanes resolves when every item is done.
---
Split `orchestrate` into helpers that receive a shared `usage` object: `plan(...)` loops `maxPlanAttempts` times (catching only `ModelError`) and returns the fallback after the loop; `work(...)` returns a `WorkerResult` instead of throwing. Call a small `addUsage(usage, response)` right after every successful `generate`, before you inspect the response.
---
Build the synthesis message from two lists: `results.filter(ok)` mapped to `[id]\noutput`, and `results.filter(failed)` mapped to their ids. Check `results.every(failed)` first and return `{ answer: null, ... }` without calling the model.
