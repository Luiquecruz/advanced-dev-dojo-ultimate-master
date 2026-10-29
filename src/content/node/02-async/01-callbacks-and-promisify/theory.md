# Callbacks and promisify

Before promises existed, every asynchronous Node API took a **callback**. Most core modules still offer that style next to the promise one, and older libraries, SDKs and database drivers only speak callbacks. To work with them you need to know the convention and how to bridge it to `async`/`await`.

## The error-first convention

A Node-style callback is always the **last argument**, and it receives the **error first**:

```ts
import { readFile } from 'node:fs';

readFile('config.json', 'utf8', (error, text) => {
  if (error) {
    console.error('Could not read config:', error.message);
    return;
  }
  console.log(text.length);
});
```

- On failure: `callback(error)`. On success: `callback(null, value)`.
- The callback is called **exactly once**.
- It is called **asynchronously**, even when the result is already known. An API that is sometimes synchronous and sometimes asynchronous (nicknamed "releasing Zalgo") makes code run in an unpredictable order.

Errors cannot be thrown to the caller: by the time the callback runs, the function that started the work has long returned, so a `try/catch` around `readFile(...)` catches nothing. That is why errors travel as an argument.

## Why callbacks hurt

Sequential steps nest ("callback hell"), every level repeats `if (error) return callback(error)`, and the classic bugs are easy to write:

```ts
function readJson(path: string, callback: (error: Error | null, data?: unknown) => void) {
  readFile(path, 'utf8', (error, text) => {
    if (error) callback(error);
    try {
      callback(null, JSON.parse(text));
    } catch (parseError) {
      callback(parseError as Error);
    }
  });
}
```

Two bugs: the missing `return` after `callback(error)` keeps going and calls the callback a second time; and if the **caller's** callback throws, the `catch` calls it again with the caller's own error. Parse inside the `try`, call the callback outside it, and `return` after every call.

## promisify: from callback to promise

A promise-returning wrapper appends its own callback and settles the promise from it:

```ts
function promisify<T>(fn: (...args: any[]) => void) {
  return (...args: unknown[]) =>
    new Promise<T>((resolve, reject) => {
      fn(...args, (error: Error | null, value: T) => (error ? reject(error) : resolve(value)));
    });
}
```

Node ships it as `util.promisify`, which also preserves `this` and supports a custom version through `util.promisify.custom`. `util.callbackify` goes the other way, for when a callback-based framework calls your async function.

## Modern Node: use the promise APIs

Most core modules now have promise versions, so you rarely need `promisify` for them:

| Legacy callback API | Modern promise API |
| --- | --- |
| `fs.readFile(path, cb)` | `import { readFile } from 'node:fs/promises'` |
| `setTimeout(cb, ms)` | `import { setTimeout } from 'node:timers/promises'` |
| `dns.lookup(host, cb)` | `import { lookup } from 'node:dns/promises'` |
| `stream.pipeline(a, b, cb)` | `import { pipeline } from 'node:stream/promises'` |

```ts
import { readFile } from 'node:fs/promises';

export async function loadJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, 'utf8'));
}
```

With `async`/`await`, errors are thrown again: a rejected promise becomes an exception at the `await`, so `try/catch` works and a `JSON.parse` failure simply rejects the returned promise. Check `error.code` (`'ENOENT'`, `'EACCES'`) to handle specific failures and rethrow the rest.

## Unhandled rejections

A rejected promise nobody awaits or catches is an **unhandled rejection**. Since Node 15 it crashes the process by default, which is what you want: silent failures are worse. The usual causes are a missing `await`, a `forEach` with an async callback (it does not wait) and fire-and-forget calls without `.catch`.

## How this runs in Dev Dojo

`node:fs` is an in-memory file system. The callback, sync and promise APIs all share it, and errors carry real Node codes such as `ENOENT`.

## When to choose it

Write new code with promises and `async`/`await`, and use the `/promises` versions of core modules. Reach for `util.promisify` when a dependency only offers callbacks, and wrap it once at the edge of your code so the rest of the codebase stays promise-based. Callbacks remain the right shape for events that happen many times (`emitter.on`, stream `'data'`), where a promise, which settles once, does not fit. Keep `callbackify` for the rare case where a legacy framework requires a callback.

## Working with AI

Ask for "promise-based code using `node:fs/promises`, no callback APIs". When reviewing generated code, check:

- Callbacks are called exactly once: a `return` after each call, no call inside a `try` that also catches the callback's own errors.
- No `try/catch` around a callback-style call expecting to catch its errors.
- No `new Promise` wrapper around something that already returns a promise.
- Every promise is awaited or explicitly handled; no `async` callbacks passed to `forEach`.
- Specific error codes (`ENOENT`) are handled and every other error is rethrown, not swallowed.
