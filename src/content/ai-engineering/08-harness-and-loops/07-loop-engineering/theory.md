# Loop Engineering

The agent loop of module 07 runs inside one task: observe, call tools, answer. **Loop engineering** is one level up: designing the system that starts agents, checks their work and decides whether to run them again, so that work moves forward without a person typing each prompt. A nightly job that fixes flaky tests, a bot that answers every new CI failure with a patch, a "run until the spec passes" script: each is a loop someone engineered, well or badly.

## The building blocks

| Block | Question it answers | Examples |
| --- | --- | --- |
| **Trigger** | When does an iteration start? | a schedule (02:00 every night), an event (CI failed, issue opened), the previous iteration's result |
| **Action** | What does the agent do? | one model call, a full agent run with tools, a sub-agent per item |
| **Verifier** | Did it work? | tests, type check, schema, a separate reviewer (previous lesson) |
| **Stop rule** | When does it end? | verified success, attempt limit, budget, stuck detection, a human gate |
| **Persistent state** | What survives between iterations and crashes? | a state record per task, a progress file, a task list, git history |
| **Escalation** | What happens when it cannot finish? | open a draft pull request, page the owner, add a label for triage |

The minimal shape is famous for being one line: the "Ralph" loop runs the same prompt in a fresh agent session forever (`while :; do cat PROMPT.md | agent; done`), with a plan file and tests as the only memory and feedback. It works surprisingly well for greenfield work precisely because each iteration starts clean and the tests push back. It also shows what is missing for production: no stop rule, no budget, no escalation.

## Stop rules are the design

A loop without a stop rule is a bill without a limit. Define them in order of precedence:

1. **Done**: the verifier passed. Nothing else counts as success; "the model said it is done" is a claim.
2. **Stuck**: the agent produced the same failing output again. More iterations will burn money on the same answer; stop early.
3. **Failures**: N verified failures. Precise feedback fixes most problems in one to three rounds; beyond that, a human is cheaper.
4. **Budget**: spent cost (or time, or tokens) reached the limit set per task.

Every stop that is not "done" is an **escalation**, and escalation is a feature: the loop hands a human a precise package (the task, the attempts, the last feedback, the money spent) instead of failing silently or looping forever.

## Persistent state makes loops safe to repeat

Triggers repeat. A CI webhook is delivered twice, a schedule fires while the previous run is still going, a worker crashes in the middle of an iteration. Three rules keep that harmless:

- **Key every run** by what it is about (`ci-failure:build-4812`). A second trigger with the same key loads the existing state instead of starting over.
- **Save state after every iteration**: iterations, failures, money spent, last output, last feedback, status. A crashed run resumes from the last saved iteration with its budget already partly spent, instead of getting a fresh budget.
- **Terminal states are terminal.** A task that is done or escalated is not re-run by a duplicate trigger; a human re-opens it on purpose.

```ts
const state = (await store.load(event.key)) ?? newState(event.key);
if (state.status !== 'running') return state;
```

## The economics of a loop

The cost of a loop is roughly cost per iteration × iterations, and both are under your control. Smaller actions (one item per iteration), cheap verifiers first, and stopping on stuck output keep both low. Track per-loop metrics: success rate, iterations to success, cost per verified success, escalation rate. A loop whose escalation rate climbs is telling you the task, the harness or the verifier changed.

## Humans own the outer loop

Agents can run the inner loop (attempt, verify, retry). People own the outer one: choosing what loops exist, what "done" means, the limits, and reviewing what comes out. A loop that runs smoothly invites you to stop reading its output; reviewing the merged work, not just the green checks, is what keeps comprehension debt from piling up.

## Pitfalls

- "Keep going until it looks done": no verifier, no stop rule.
- Budgets in memory, reset by every crash or duplicate trigger.
- Retrying an identical failing output.
- Escalation that is just an error log nobody reads.
- Loops with credentials wider than their task, running unattended at night.

> **Status as of October 2026:** "loop engineering" became a common name after Addy Osmani's essay of June 2026, building on Geoffrey Huntley's "Ralph" loop (July 2025). Coding agents ship loop primitives: Claude Code has `/loop` and scheduled tasks for recurring prompts and `/goal` to keep working until a written condition holds; CI-triggered agents that respond to failing builds or new issues are offered by several platforms. The term is `emerging`; definitions still vary between authors.

## When to choose it

Build a loop when the work recurs (every failed build, every new dependency release, every night's flaky tests) and success is mechanically verifiable. Start with a small action, a strict verifier, a failure limit of two or three, a per-task budget and a useful escalation; widen them only with data. Do not loop work that cannot be verified or that needs judgment at each step: keep a human in the inner loop there, or do it with plain automation that needs no model at all.
