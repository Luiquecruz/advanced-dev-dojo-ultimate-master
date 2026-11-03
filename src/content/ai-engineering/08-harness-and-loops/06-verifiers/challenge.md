Build a verify loop: the model answers, verifiers check the answer from cheapest to most expensive, the first failure is fed back to the model, and the loop stops after a bounded number of attempts. Then write two verifiers: a schema check and a test suite of examples.

A **verifier** is `{ name, check(output) }`; `check` returns (or resolves to) `{ passed, feedback? }`, where `feedback` explains a failure.

## 1. `runVerified(model, task, options)`

`task` is `{ prompt, system? }`; `options` is `{ verifiers, maxAttempts }`.

1. The first request has the messages `[{ role: 'system', content: system }]` (only when `system` is given) followed by `{ role: 'user', content: prompt }`.
2. Each attempt calls `model.generate` once with the current messages and takes the response `text` as the output.
3. When the response's `finishReason` is not `'stop'`, the attempt fails with verifier name `'completion'` and feedback that contains the finish reason; no verifier runs.
4. Otherwise run the verifiers **in order** and stop at the first one that does not pass; later verifiers do not run. When every verifier passes, return `{ status: 'passed', output, attempts, failures }`.
5. After a failed attempt, if attempts remain, append `{ role: 'assistant', content: output }` and then a `user` message that contains the failing verifier's name and its feedback, and start the next attempt with all messages so far.
6. After `maxAttempts` failed attempts, return `{ status: 'failed', output, attempts, failures }` with the last output.

`attempts` is the number of model calls made. `failures` lists every failed attempt in order as `{ attempt, verifier, feedback }` (`attempt` starts at 1; `feedback` is `''` when the verifier gave none). A verifier that throws, and any model error, end the run with that error unchanged.

## 2. `schemaVerifier(schema)`

Return a verifier named `'schema'` for outputs that should be JSON matching a Zod schema.

- Output that is not valid JSON fails with feedback that starts with `Not valid JSON`.
- Otherwise validate with `schema.safeParse`. On failure, the feedback has one line per issue: the issue's `path` joined with `.` (or `(root)` when the path is empty), `: `, and the issue's `message`.

## 3. `examplesVerifier({ shouldMatch, shouldReject })`

Return a verifier named `'examples'` for outputs that should be a regular expression (the trimmed output is the pattern source, with no slashes or flags).

- A pattern that `new RegExp` rejects fails with feedback that starts with `Not a valid regular expression`.
- Otherwise the pattern must match **the whole string** of every `shouldMatch` example and of no `shouldReject` example. On failure, the feedback has one line per failing example, containing the example in double quotes, for instance `should match: "ORD-2026-000123"` or `should not match: "ord-2026-1"`.

The tests drive the model with scripted and dynamic replies (it may improve after feedback or not) and check calls, messages and results, never the wording of model output.
