# Verifiers

An agent that says "done" has made a claim, not delivered a result. A **verifier** is a check the output must pass before the harness accepts it: a test suite, a type check, a schema, a linter, a screenshot comparison, a second model with a rubric. Verifiers turn "it looks done" into "it passed these checks", and their failure messages are the most useful input the next model step can receive.

## Guides and sensors

A useful way to sort harness controls: **guides** steer the agent before it acts (context files, examples, conventions), and **sensors** observe after it acts so it can correct itself. Verifiers are the sensors. Prompts improve the odds of a good first attempt; verifiers make the final result trustworthy even when the first attempt was wrong.

| Verifier | Kind | Cost | Catches |
| --- | --- | --- | --- |
| Parse / schema | computational | microseconds | malformed JSON, missing fields, wrong types |
| Lint, format, type check | computational | seconds | style, unused code, type errors |
| Unit and integration tests | computational | seconds to minutes | wrong behavior covered by tests |
| Build, screenshot, end-to-end | computational | minutes | broken pages, regressions users would see |
| Model judge with rubric | inferential | a model call | tone, completeness, things code cannot check |

**Computational** checks are deterministic, cheap and run on every attempt. **Inferential** checks (a model judging) see semantics but are slower, cost money and can be wrong themselves; module 10 covers calibrating them. When you use one, make the judge a separate call with its own instructions: a model grading its own answer in the same conversation tends to approve it.

## The verify loop

```ts
for (let attempt = 1; attempt <= maxAttempts; attempt++) {
  const output = (await model.generate({ messages })).text;
  const failure = await firstFailure(verifiers, output);
  if (!failure) return { status: 'passed', output, attempts: attempt };
  messages.push({ role: 'assistant', content: output });
  messages.push({ role: 'user', content: `Verifier "${failure.name}" failed:\n${failure.feedback}\nFix it and answer again.` });
}
return { status: 'failed', attempts: maxAttempts };
```

Four decisions hide in those lines.

**Order the checks from cheap to expensive and stop at the first failure.** There is no point running a five-minute test suite on output that does not parse. The first failing check also produces the most focused feedback.

**Feed back the failure, not just the fact of failure.** "Try again" wastes an attempt. "`price`: expected a positive number, received -3" or "should match `ORD-2026-000123`" tells the model exactly what to change. Write verifier messages for a model reader: short, specific, with the failing input and the expectation. Keep the previous answer in the history so the model edits instead of starting over.

**Check completeness before content.** An output cut off by the token limit (`finishReason: 'length'`) or refused is not a candidate; report that as its own failure instead of running every verifier on half an answer.

**Bound the attempts.** Every retry costs a model call and the improvement per attempt drops fast; if three rounds of precise feedback did not fix it, a fourth rarely will. Return a failed result with the history of failures so a human (or the escalation logic of the next lesson) can take over. A verifier that crashes is a harness bug: stop and surface it, never count it as a pass.

## Verifiers can be gamed

An optimizer pointed at a check optimizes the check. Agents have been observed deleting failing tests, hard-coding expected values, loosening a schema or wrapping code in `try`/`catch` to silence errors. Protect the verifiers:

- keep test files and schemas outside the agent's write permissions, or detect edits to them with a hook;
- check what you actually care about (behavior on held-out cases, not just the cases in the prompt);
- review the diff, not only the green check mark.

Verification also does not prove the agent understood the task. A test suite with gaps passes wrong code. Verifiers raise the floor; they do not replace review of what matters.

## Pitfalls

- "Keep going until it looks done": a loop with no verifier.
- Feedback that says "failed" without saying what.
- The writer model grading its own work in the same context.
- Unlimited attempts, or attempts limited but never reported.
- Tests the agent can edit.

> **Status as of October 2026:** coding agents increasingly ship verifier hooks and goal conditions: Claude Code's `Stop` hook can refuse to end a turn until a check passes, and its `/goal` command keeps working until a stated condition holds, judged after each turn. Practitioner write-ups on harness engineering (for example on martinfowler.com) frame verifiers as "sensors" and recommend fast computational checks on every change, with inferential review later in the pipeline.

## When to choose it

Add a verifier whenever correctness can be checked mechanically: structured output gets a schema, code gets tests and a type check, generated SQL gets an explain plan or a dry run. Use bounded attempts (two or three) with precise feedback for model outputs, and route failures to a human or a stronger model instead of retrying forever. Add a model judge only for qualities code cannot check, as a separate call, and measure how often it agrees with people before trusting it.
