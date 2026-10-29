Write the shutdown handler every production server needs.

```ts
setupGracefulShutdown(server: Server, options?: {
  timeoutMs?: number;                      // default 10_000
  cleanup?: () => void | Promise<void>;    // close pools, flush buffers; default: nothing
  exit?: (code: number) => void;           // default: (code) => process.exit(code)
  signals?: string[];                      // default ['SIGTERM', 'SIGINT']
}): { isShuttingDown(): boolean; shutdown(signal: string): Promise<void> }
```

1. Register a `process.on(signal, ...)` listener for each of `signals` that calls `shutdown(signal)`.
2. `shutdown(signal)`:
   - runs **only once**: later calls (and later signals) return the same promise without closing or cleaning up again;
   - sets `isShuttingDown()` to `true` immediately;
   - starts a timer of `timeoutMs` that calls `exit(1)`; the timer must be `unref()`'d and cleared when the shutdown finishes;
   - calls `server.close()` and waits for its callback (it fires when in-flight requests have finished; reject on an error argument);
   - then awaits `cleanup()` and calls `exit(0)`;
   - if closing or cleanup fails, calls `exit(1)`.
3. `exit` is called **at most once** per shutdown, whichever happens first (the timeout or the end of the clean path).

The tests create their own servers, emit signals with `process.emit('SIGTERM')` and pass `fn()` mocks as `exit` and `cleanup`.
