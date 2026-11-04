`stop_reason` is four `if` statements in the documented order. Write it first and use it as the only place where the loop decides to stop; `handle_trigger` then never compares limits itself.
---
Start `handle_trigger` with `state = await store.load(event["key"]) or new_state(event["key"])` and loop `while state["status"] == "running"`. A finished state skips the loop entirely, which is exactly the "duplicate trigger" rule.
---
Put the model call in a helper that returns either `{"text": ..., "cost": ...}` or `{"error": error}` for a `ModelError` (`except ModelError as error`; anything else propagates). Build the user message from `event["task"]` plus `state["lastFeedback"]` when it is not `None`. After the call, increment `"iterations"`; for an error, count a failure and set `"lastFeedback"` to a message with `error.code`; otherwise add the cost and verify.
---
On a failed verdict, compare the text with `state["lastOutput"]` before overwriting it: that comparison is the stuck check. Compute the reason with `stop_reason`, set `"status"` (and `"escalationReason"` for anything but `"done"`), `await store.save(key, {**state})`, and only then call `escalate` for an escalated state. `verify` and `escalate` may be plain or async: await their result when `inspect.isawaitable` says so.
