Keep one `messages` array for the whole run and one loop `for (let attempt = 1; attempt <= maxAttempts; attempt++)`. Each iteration makes exactly one `generate` call. Return from inside the loop as soon as an attempt passes; after the loop, return the failed result.
---
Write a helper `firstFailure(verifiers, output)` that loops over the verifiers, `await`s each `check`, and returns `{ verifier: name, feedback: feedback ?? '' }` for the first one that did not pass, or `undefined`. Do not catch errors there: a crashing verifier must end the run. Check `finishReason !== 'stop'` before calling the helper and build the `completion` failure yourself.
---
After a failure, record `{ attempt, verifier, feedback }`, and only when `attempt < maxAttempts` push two messages: the assistant's output, then a user message such as `Verifier "<name>" failed:\n<feedback>\nFix the problem and answer again.`
---
For `schemaVerifier`, parse inside `try`/`catch`, then `schema.safeParse(value)`; map `result.error.issues` to `${issue.path.length === 0 ? '(root)' : issue.path.join('.')}: ${issue.message}`. For `examplesVerifier`, compile `new RegExp('^(?:' + output.trim() + ')$')` inside `try`/`catch` so the pattern must match whole strings, then collect `should match: "..."` and `should not match: "..."` lines.
