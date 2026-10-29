Build three cancellation primitives with `AbortController` and `AbortSignal`.

1. `sleep(ms, signal?)` returns a promise that resolves (with `undefined`) after `ms` milliseconds.
   - If `signal` is already aborted, reject immediately with `signal.reason`.
   - If `signal` aborts while waiting, clear the timer and reject with `signal.reason` (an `AbortError` `DOMException` when `abort()` is called without a reason).
   - On success, remove the `'abort'` listener.
2. `withTimeout(task, ms, parent?)` runs `task(signal)` with a deadline:
   - build the signal with `AbortSignal.timeout(ms)`, combined with `parent` through `AbortSignal.any` when a parent signal is given;
   - pass that signal to `task` and resolve or reject like the task when it settles first;
   - when the signal aborts first, reject with `signal.reason` (its `name` is `'TimeoutError'` for the deadline and `'AbortError'` when the parent was aborted), **even if the task ignores the signal and never settles**.
3. `latestOnly(task)` returns a function `(input) => Promise`. Each call runs `task(input, signal)` with a fresh `AbortController`'s signal and first aborts the controller of the previous call, so only the latest call keeps a live signal.

Press **Run**: the slow task should report `TimeoutError` and the fast one `done`.
