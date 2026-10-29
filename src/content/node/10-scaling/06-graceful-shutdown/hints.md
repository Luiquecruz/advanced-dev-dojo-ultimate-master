Keep the promise of the running shutdown in a variable (`let done: Promise<void> | undefined`). At the start of `shutdown`, `if (done) return done;`: that single line makes repeated signals harmless.
---
Wrap `exit` in a `finish(code)` helper guarded by an `exited` flag, so the timeout and the clean path can both call it safely. Start the timer with `const timer = setTimeout(() => finish(1), timeoutMs); timer.unref();`.
---
Turn `server.close` into a promise: `new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))`. Then build `done` as an async IIFE: `try { await closeServer(); await cleanup(); finish(0); } catch { finish(1); } finally { clearTimeout(timer); }`.
---
Register the signals at the end: `for (const signal of signals) process.on(signal, () => { shutdown(signal); });` and return `{ isShuttingDown: () => shuttingDown, shutdown }`.
