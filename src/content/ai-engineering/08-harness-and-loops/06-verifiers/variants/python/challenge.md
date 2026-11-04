Build a verify loop: the model answers, verifiers check the answer from cheapest to most expensive, the first failure is fed back to the model, and the loop stops after a bounded number of attempts. Then write two verifiers: a schema check and a test suite of examples.

A **verifier** is a `Verifier(name, check)` (a dataclass defined in the starter); `check(output)` returns, or for an `async` check resolves to, `{"passed": bool, "feedback": str}`, where the optional `"feedback"` explains a failure.

## 1. `run_verified(model, task, *, verifiers, max_attempts)`

`task` is a dict `{"prompt": ..., "system": ...}` with an optional `"system"`.

1. The first request has the messages `[{"role": "system", "content": system}]` (only when `"system"` is given) followed by `{"role": "user", "content": prompt}`.
2. Each attempt awaits `model.generate` once with the current messages and takes the response `"text"` as the output.
3. When the response's `"finishReason"` is not `"stop"`, the attempt fails with verifier name `"completion"` and feedback that contains the finish reason; no verifier runs.
4. Otherwise run the verifiers **in order** and stop at the first one that does not pass; later verifiers do not run. When every verifier passes, return `{"status": "passed", "output": ..., "attempts": ..., "failures": [...]}`.
5. After a failed attempt, if attempts remain, append `{"role": "assistant", "content": output}` and then a `user` message that contains the failing verifier's name and its feedback, and start the next attempt with all messages so far.
6. After `max_attempts` failed attempts, return `{"status": "failed", ...}` with the last output.

`"attempts"` is the number of model calls made. `"failures"` lists every failed attempt in order as `{"attempt": ..., "verifier": ..., "feedback": ...}` (`"attempt"` starts at 1; `"feedback"` is `""` when the verifier gave none). A verifier that raises, and any model error (`ModelError`), end the run with that exception unchanged.

## 2. `schema_verifier(schema)`

Return a verifier named `"schema"` for outputs that should be JSON matching a schema. `schema` is any object with `safe_parse(value)` (the tests pass a small hand-written one, shaped like Zod's `safeParse`), which returns `{"success": True, "data": ...}` or `{"success": False, "issues": [{"path": [...], "message": ...}, ...]}`.

- Output that is not valid JSON fails with feedback that starts with `Not valid JSON`.
- Otherwise validate with `schema.safe_parse`. On failure, the feedback has one line per issue: the issue's `"path"` parts joined with `.` (or `(root)` when the path is empty), `: `, and the issue's `"message"`.

## 3. `examples_verifier(*, should_match, should_reject)`

Return a verifier named `"examples"` for outputs that should be a regular expression (the trimmed output is the pattern source, with no slashes or flags).

- A pattern that `re.compile` rejects fails with feedback that starts with `Not a valid regular expression`.
- Otherwise the pattern must match **the whole string** of every `should_match` example and of no `should_reject` example. On failure, the feedback has one line per failing example, containing the example in double quotes, for instance `should match: "ORD-2026-000123"` or `should not match: "ord-2026-1"`.

Both built-in verifiers use a plain (not `async`) `check`. The tests drive the model with scripted and dynamic replies (it may improve after feedback or not) and check calls, messages and results, never the wording of model output.
