`stopReason` is four `if` statements in the documented order. Write it first and use it as the only place where the loop decides to stop; `handleTrigger` then never compares limits itself.
---
Start `handleTrigger` with `const state = (await store.load(event.key)) ?? newState(event.key)` and loop `while (state.status === 'running')`. A finished state skips the loop entirely, which is exactly the "duplicate trigger" rule.
---
Put the model call in a helper that returns either `{ text, cost }` or `{ error }` for a `ModelError` (rethrow anything else). Build the user message from `event.task` plus `state.lastFeedback` when it is not `null`. After the call, increment `iterations`; for an error, count a failure and set `lastFeedback` to a message with `error.code`; otherwise add the cost and verify.
---
On a failed verdict, compare the text with `state.lastOutput` before overwriting it: that comparison is the stuck check. Compute the reason with `stopReason`, set `status` (and `escalationReason` for anything but `'done'`), `await store.save(key, { ...state })`, and only then call `escalate` for an escalated state.
