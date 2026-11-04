Build the outer loop of an agent that reacts to triggers (for example "CI build 4812 failed"): it acts with a model, verifies the result, saves its state after every iteration, stops on success, stuck output, too many failures or an exhausted budget, escalates to a human, and treats repeated triggers safely.

## Data

Events, states and limits are JSON-ready dicts with camelCase keys, because states are persisted.

- An **event** is `{"key": ..., "task": ...}`: `"key"` identifies the work (`"ci-failure:build-4812"`), `"task"` describes it.
- The **state** of a key is `{"key", "status", "iterations", "failures", "spentUsd", "lastOutput", "lastFeedback", "escalationReason"}`, where `"status"` is `"running"`, `"done"` or `"escalated"`; a new state has zero counters and `None` texts.
- `limits` is `{"maxFailures": ..., "budgetUsd": ...}`.
- The starter defines `LOOP_SYSTEM` (the system prompt) and `create_memory_store()`, a store with the async methods `load(key)` (the saved state, or `None`) and `save(key, state)`.

## 1. `stop_reason(check, limits)`

`check` is `{"passed", "stuck", "failures", "spentUsd"}`. Return, in this order of precedence:

1. `"done"` when `"passed"`;
2. `"stuck"` when `"stuck"`;
3. `"failures"` when `failures >= maxFailures`;
4. `"budget"` when `spentUsd >= budgetUsd`;
5. otherwise `None`.

## 2. `handle_trigger(event, *, model, store, verify, escalate, limits)`

`verify(output, event)` returns `{"passed": bool, "feedback": str}` (plain or async); `escalate({"key": ..., "reason": ..., "state": ...})` notifies a human (plain or async).

1. Load the state of `event["key"]`. When it is `"done"` or `"escalated"`, return it unchanged: no model call, no save, no escalation. Otherwise continue from it (or from a new state).
2. **Act.** Await `model.generate` once with two messages: `{"role": "system", "content": LOOP_SYSTEM}` and a `user` message that contains `event["task"]` and, when `"lastFeedback"` is not `None`, that feedback.
   - If the call raises a `ModelError`, the iteration counts as a failure with feedback that contains the error `code`; the output and the money spent do not change, and the iteration is not stuck. Any other exception ends the run unchanged.
3. Add one to `"iterations"` and the response's `usage["cost"]` to `"spentUsd"`.
4. **Verify** the response text with `verify(text, event)`. On failure, add one to `"failures"`, set `"lastFeedback"` to the feedback, and mark the iteration **stuck** when the text equals `"lastOutput"` (the previous output). In both cases, then set `"lastOutput"` to the text. Exceptions raised by `verify` end the run unchanged.
5. **Stop rule.** Compute `stop_reason({"passed", "stuck", "failures", "spentUsd"}, limits)`.
   - `"done"`: set `"status"` to `"done"`.
   - `"stuck"`, `"failures"` or `"budget"`: set `"status"` to `"escalated"` and `"escalationReason"` to the reason.
6. **Save** the state after every iteration, before anything else happens. After saving an escalated state, call `escalate({"key", "reason", "state"})` once.
7. Repeat from step 2 while the status is `"running"`; return the final state.

Because the state is saved after every iteration, a run that crashed resumes where it stopped (its counters and spending kept) when the same key triggers again, and a finished key is never re-run.

The tests script successes, failures, repeated outputs, outages, prices and crashes, and check calls, saved states and escalations, never the wording of model output.
