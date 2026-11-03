# Durable Execution

A chat reply takes seconds. An agent that researches a market, migrates a codebase or processes a refund that waits for approval can run for minutes, hours or days. Over that time something will fail: a deploy restarts the worker, the machine is preempted, the model provider returns a `500` on step 37. If the run lives only in memory, all of its work is lost, and worse, restarting it from scratch may **repeat side effects**: the card charged twice, the email sent twice.

**Durable execution** means a run survives crashes: it records its progress as it goes and, when restarted, continues where it stopped without redoing completed work.

## Checkpoints

The agent loop has a convenient property: its whole state is data. The conversation, the step count, the status and the final answer fit in one JSON document. Save it under a **run id** after every step, and a restarted process can load it and continue.

```ts
const checkpoint = (await store.load(runId)) ?? newCheckpoint(runId, task);
```

Three rules make checkpoints trustworthy:

- **Atomic writes.** Write to a temporary file and rename it over the old one (or use a database transaction). A crash mid-write must leave the previous checkpoint intact, never half of a new one.
- **Persist intent before acting.** Save the assistant turn with its tool calls *before* executing them. On resume, calls without results are visible as unfinished work.
- **Persist results right after acting,** one call at a time, so the window between "it happened" and "it is recorded" is as small as possible.

Model calls need no special care: they have no side effects, so a resumed run that repeats a lost model call only pays for it again.

## The gap, and idempotency keys

Even with careful checkpoints, one window remains: the tool ran (the card was charged), and the process died before the result was saved. On resume, the run sees an unanswered call and must run it again. Whether that is safe depends on the tool.

The standard answer is an **idempotency key**: a value that identifies *this* operation, sent with the request, so the downstream service performs it at most once and returns the original result for repeats. Payment APIs have supported this for years; build your own tools the same way.

```ts
await payments.charge({ amount }, { idempotencyKey: `${runId}:${call.id}` });
```

The key must be **stable across attempts** (derived from the run and the tool call id, never from a timestamp or a random number) and **unique per operation** (two different charges in one run get different keys). When a tool cannot be made idempotent, check before acting ("was this email already sent?") or put it behind a human approval.

## Exactly once is a combination

No single mechanism gives exactly-once side effects. The combination does:

| Mechanism | Protects |
| --- | --- |
| Checkpoint after each step | completed work is not redone after a crash |
| Save calls before executing | unfinished calls are found on resume |
| Idempotency keys | a call repeated after a crash has no second effect |
| Atomic writes | a crash during a save does not corrupt the run |

## Durable execution engines

You can build checkpointing yourself, as in this lesson, for one loop. Workflow engines generalize it: you write ordinary code, and the engine records every step's result in an event history; after a crash, it **replays** the code, returning recorded results instead of re-executing completed steps. They add timers that sleep for days, retries with backoff, signals (an approval arriving), and visibility into every running workflow. The price is a new runtime to operate and rules about determinism in workflow code (no direct clock reads or random numbers outside recorded steps).

## Pitfalls

- Saving state only at the end of a run.
- Executing tool calls before saving the assistant turn that requested them.
- Non-atomic writes that leave a corrupt checkpoint after a crash.
- Idempotency keys built from `Date.now()` or random values, which differ on every retry.
- Assuming the model call is the risky part; the tools are.
- Building a general workflow engine by accident when you needed an existing one.

> **Status as of October 2026:** durable execution engines used for agents include Temporal, Restate, DBOS, Inngest and Cloudflare Workflows; LangGraph persists graph state with checkpointers and documents durability modes; agent SDKs increasingly offer integrations with these engines. Idempotency keys are standard in payment APIs such as Stripe's.

## When to choose it

Checkpoint any agent run that lasts longer than a request, waits for humans, or performs side effects you cannot safely repeat. A plain store plus idempotent tools is enough for a single loop with a few steps. Move to a durable execution engine when you have many long-running workflows, timers and signals, or when you need to see and operate them in production. For short read-only agents, durability buys little: rerunning from scratch is simpler.
