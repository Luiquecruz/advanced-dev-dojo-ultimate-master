Build the two pieces that keep a multi-service order consistent without a distributed transaction: an orchestrated saga that undoes completed steps when a later one fails, and a handler that makes retried requests safe with an idempotency key.

```python
step = {
    "name": "payment",
    "action": charge_card,  # action(context); raising means the step failed
    "compensate": refund,   # compensate(context); undoes a completed action
}

async def run_saga(steps: list[dict], context) -> dict: ...
def create_idempotent_handler(handler) -> Callable[[str, object], Awaitable]: ...  # returns async handle(key, request)
```

`action`, `compensate` and `handler` may be plain functions or `async def` functions. The starter's `invoke(function, *args)` calls either kind and returns the result, awaited when it is awaitable.

**`run_saga(steps, context)`** runs each step's `action(context)` in order and waits for it, passing the same `context` to every call. It returns a dict:

- When every action succeeds: `"status": "completed"`, `"completed"` lists every step name in order, `"compensated"` and `"failed_compensations"` are empty lists and there is no `"failed_step"`.
- When an action raises, the saga stops: later actions never run and the failed step is **not** compensated (its local transaction rolled back on its own). Then it runs `compensate(context)` of every completed step **in reverse order**, waiting for each one. The result has `"status": "compensated"`, `"failed_step"` (the name of the step that failed), `"completed"` (the steps whose action succeeded, in order) and `"compensated"` (the steps whose compensation succeeded, in the order they ran).
- A compensation that raises does not stop the others: its step name goes to `"failed_compensations"` and the remaining compensations still run.

**`create_idempotent_handler(handler)`** returns an async function `handle(key, request)`:

- The first call with a key runs `handler(request)` and stores its result under the key. Any later call with the same key returns the stored result without calling `handler` again.
- A call with the same key while the first one is still running shares that execution: `handler` runs once and both calls return the same result.
- When `handler` raises, the call raises that exception and nothing is stored, so the next call with that key runs `handler` again.

A production server would also reject a key reused with a different request and expire old keys; this model leaves both out.
