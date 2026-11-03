Write one helper first: `parseJson(text)` that returns the parsed value or `undefined` inside a `try`/`catch`, and read fields from the result only after checking it is an object. Every pattern that reads JSON (route, vote, evaluator) reuses it, and every unusable answer becomes `undefined` instead of an exception.
---
The chain is a `for` loop that carries `previous` forward; check `response.finishReason !== 'stop'` and the optional gate before pushing the output. Routing is two calls: build the route list into the system message of the JSON request, pick the name only if `Object.keys(routes).includes(name)`, and fall back otherwise.
---
Parallel means starting every promise before awaiting any: `Promise.all(sections.map(...))`. Voting is the same with `Promise.allSettled`, so a rejected call becomes an abstention. To find the verdict, sort the `[label, count]` entries by count and accept the first only if it is alone or beats the second.
---
For the evaluator-optimizer, keep `draft` and the `feedback` array outside a `for (round = 1..maxRounds)` loop. Build the writer messages from the task (round 1) or task + previous draft + last feedback (later rounds), then send the evaluator a JSON request whose user message contains the draft. Return as soon as `pass === true`; after the loop, return the last draft with `accepted: false`.
