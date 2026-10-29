# Cancellation and Timeouts

A promise cannot be cancelled. `Promise.race` against a timer lets **you** stop waiting, but the slow request keeps running, holding a socket, a database connection and memory. On a server that matters twice: every outbound call needs a deadline, and when a client disconnects, the work done for it should stop. The standard tool is the same one you may have used in React effects: `AbortController` and `AbortSignal`.

## AbortController and AbortSignal

```ts
const controller = new AbortController();
const response = fetch('https://api.example.com/report', { signal: controller.signal });
controller.abort();
```

The **controller** is the side that cancels; the **signal** is the read-only side you hand to the work. `abort(reason?)` sets `signal.aborted = true`, stores `signal.reason` (an `AbortError` `DOMException` by default) and fires the `'abort'` event once. `fetch` then rejects with that reason. Node APIs accept signals too: `fs.readFile`, `timers/promises.setTimeout`, `events.once`, `stream.pipeline`, `child_process.exec`, and most modern libraries (database drivers, the AWS SDK, OpenAI clients).

## Built-in timeouts: AbortSignal.timeout

```ts
const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
```

`AbortSignal.timeout(ms)` returns a signal that aborts itself after `ms` with a `TimeoutError` `DOMException`. No timer to clear, no controller to keep. Checking `error.name` tells the two cases apart:

| `error.name` | Meaning | Typical response |
| --- | --- | --- |
| `'TimeoutError'` | The deadline passed | Retry, fall back, or answer `504` |
| `'AbortError'` | Someone cancelled on purpose | Usually nothing: the caller is gone |

## Combining signals: AbortSignal.any

Real work often has several reasons to stop: its own deadline **and** the client disconnecting **and** the server shutting down. `AbortSignal.any([...])` returns a signal that aborts as soon as any input aborts, with that input's reason.

```ts
app.get('/report', async (c) => {
  const signal = AbortSignal.any([c.req.raw.signal, AbortSignal.timeout(10_000)]);
  const report = await buildReport({ signal });
  return c.json(report);
});
```

Before `AbortSignal.any` (Node 20), this took a hand-made controller with listeners on every input, and those listeners were easy to leak.

## Making your own code cancellable

Cancellation is **cooperative**: a signal only stops code that listens to it. Pass it down to every call that accepts one, and in your own async primitives listen for `'abort'`:

```ts
function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      return reject(signal.reason);
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    function onAbort() {
      clearTimeout(timer);
      reject(signal!.reason);
    }
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}
```

The checklist hidden in those lines: reject immediately if already aborted, reject with `signal.reason` (so callers can check the name), release the underlying resource (the timer), and remove the listener on success so long-lived signals do not accumulate listeners. Between steps of a long loop, `signal.throwIfAborted()` is the cheap check.

`node:timers/promises` already ships this primitive: `await setTimeout(100, undefined, { signal })`.

## Timeouts that do not trust the task

A signal asks the task to stop; a task that ignores it (a third-party function, a CPU loop) keeps your caller waiting forever. A robust timeout helper does both: passes the signal down **and** rejects the returned promise itself when the signal aborts. The task may keep running in the background, but your request handler gets its answer on time.

## Latest wins

The frontend classic (a search box where only the last request matters) appears on servers too, for example in a streaming endpoint where a new query replaces the previous one. Keep the previous controller and abort it when a new call starts:

```ts
let current: AbortController | undefined;
function search(query: string) {
  current?.abort();
  current = new AbortController();
  return fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal: current.signal });
}
```

## When to choose it

Every outbound network call on a server needs a timeout: `AbortSignal.timeout` is the default choice, set from the caller's budget (a 30 s gateway timeout leaves less than that for each dependency). Combine with the request's own signal through `AbortSignal.any` for work that should stop when the client leaves. Use `Promise.race` alone only when the operation cannot accept a signal, and accept that it keeps running. Library-specific options (`timeout` in an HTTP client, a query timeout in the database) are fine; prefer the ones that actually cancel the work.

## Working with AI

Ask for "a timeout with `AbortSignal.timeout`, combined with the request signal via `AbortSignal.any`". When reviewing generated code, check:

- Every `fetch` or SDK call to another service has a timeout.
- Signals are passed all the way down, not created and dropped.
- `TimeoutError` and `AbortError` are told apart by `error.name`, not by message text.
- Hand-written helpers reject immediately when already aborted, clean up timers and remove listeners.
- `Promise.race` timeouts are not presented as cancellation.
