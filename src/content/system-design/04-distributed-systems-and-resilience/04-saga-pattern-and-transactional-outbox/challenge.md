Build the two pieces that keep a multi-service order consistent without a distributed transaction: an orchestrated saga that undoes completed steps when a later one fails, and a handler that makes retried requests safe with an idempotency key.

```ts
interface SagaStep<C> {
  name: string;
  action(context: C): unknown;      // may return a promise; throwing or rejecting means the step failed
  compensate(context: C): unknown;  // may return a promise; undoes a completed action
}

interface SagaResult {
  status: 'completed' | 'compensated';
  completed: string[];
  compensated: string[];
  failedCompensations: string[];
  failedStep?: string;
}

export async function runSaga<C>(steps: SagaStep<C>[], context: C): Promise<SagaResult>
export function createIdempotentHandler<Req, Res>(handler: (request: Req) => Res | Promise<Res>): (key: string, request: Req) => Promise<Res>
```

**`runSaga`** awaits each step's `action(context)` in order, passing the same `context` to every call.

- When every action succeeds: `status: 'completed'`, `completed` lists every step name in order, `compensated` and `failedCompensations` are empty and `failedStep` is not set.
- When an action throws or rejects, the saga stops: later actions never run and the failed step is **not** compensated (its local transaction rolled back on its own). Then it awaits `compensate(context)` of every completed step **in reverse order**. The result has `status: 'compensated'`, `failedStep` (the name of the step that failed), `completed` (the steps whose action succeeded, in order) and `compensated` (the steps whose compensation succeeded, in the order they ran).
- A compensation that throws or rejects does not stop the others: its step name goes to `failedCompensations` and the remaining compensations still run.

**`createIdempotentHandler(handler)`** returns a function `(key, request)` that always returns a promise:

- The first call with a key runs `handler(request)` and stores its result under the key. Any later call with the same key returns the stored result without calling `handler` again.
- A call with the same key while the first one is still running shares that execution: `handler` runs once and both calls resolve to the same result.
- When `handler` throws or rejects, the call rejects with that error and nothing is stored, so the next call with that key runs `handler` again.

A production server would also reject a key reused with a different request and expire old keys; this model leaves both out.
