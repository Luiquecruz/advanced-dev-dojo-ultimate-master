`parse_plan` is defensive parsing from module 02: slice from `text.find("{")` to `text.rfind("}")`, wrap `json.loads` in `try`/`except ValueError`, then check that the result is a dict, that `"subtasks"` is a non-empty list, every field, and a `set` of ids. Any problem returns `None`; only then `plan[:max_subtasks]`.
---
For `run_with_concurrency`, create one `asyncio.Semaphore(limit)` and wrap `run` in a small coroutine that does `async with semaphore: return await run(item, index)`. `asyncio.gather` over one wrapped call per item starts them all, the semaphore lets only `limit` through at a time, and `gather` returns the results in input order.
---
Split `orchestrate` into helpers that receive a shared `usage` dict: `plan(...)` loops `max_plan_attempts` times (catching only `ModelError`) and returns the fallback after the loop; `work(...)` returns a worker result instead of raising. Call a small `add_usage(usage, response)` right after every successful `generate`, before you inspect the response.
---
Build the synthesis message from two lists: the successful results mapped to `f"[{id}]\n{output}"`, and the failed results mapped to their ids. Check `all(result["status"] == "failed" for result in results)` first and return `{"answer": None, ...}` without calling the model.
