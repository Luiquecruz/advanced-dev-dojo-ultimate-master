1. Write `sleep` as the reference cancellable primitive: early rejection for an already aborted signal, a listener that releases the resource (the timer) and rejects with `signal.reason`, and listener cleanup on the success path.
2. Reject with `signal.reason` rather than a new error, so callers can tell a deadline (`TimeoutError`) from a deliberate cancel (`AbortError`) by `name`.
3. In `withTimeout`, let the platform own the timer: `AbortSignal.timeout` needs no `clearTimeout`, and `AbortSignal.any` merges the parent's reason and the deadline into one signal.
4. Do not trust the task to cooperate. Settle the outer promise from the signal's `'abort'` event as well as from the task, so the caller always gets an answer on time; the first settlement wins.
5. Remove the abort listener once the task settles, so a long-lived parent signal does not collect listeners from finished calls.
6. For `latestOnly`, the closure remembers the previous controller; aborting it before each new call turns "only the last result matters" into real cancellation of the older work.
