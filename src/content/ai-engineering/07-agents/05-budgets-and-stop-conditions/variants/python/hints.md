For `call_signature`, `json.dumps(value, sort_keys=True)` already sorts keys at every depth. Return `f"{name}:{json.dumps(json.loads(arguments), sort_keys=True)}"` inside a `try`, and `f"{name}:{arguments}"` in the `except ValueError`.
---
Keep a `usage` dict with all five totals and a small nested `finish(reason, detail, answer=None)` helper that builds the result with `"elapsedMs": now() - started_at`. Then every exit is one line, and the totals can never be forgotten in one of them.
---
Use `while True` and put the two "before" checks at the top: `usage["steps"] >= budget["maxSteps"]` and `budget.get("maxDurationMs") is not None and now() - started_at >= budget["maxDurationMs"]`. After the call, update totals and append the assistant turn, then check refusal, final answer, tokens and cost in that order, all before the tool loop.
---
Stuck detection needs two variables outside the loop: `last_signature` and `repeats`. For each tool call, `repeats = repeats + 1 if signature == last_signature else 1`, then `last_signature = signature`; if `repeats >= repeat_limit`, finish with `stuck` before executing that call.
