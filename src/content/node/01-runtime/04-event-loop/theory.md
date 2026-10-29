# The Event Loop

Node runs your JavaScript on one thread. The **event loop** decides what runs next on that thread once the current code finishes. You already know half of it from the browser: synchronous code runs to completion, then microtasks (promise callbacks), then the next task (a timer, an event). Node adds its own queues and a fixed sequence of **phases**, provided by libuv.

## Run to completion

A callback is never interrupted. Nothing else runs until the current function returns and the call stack is empty, so every scheduled callback waits for the synchronous code to finish:

```ts
setTimeout(() => console.log('timer'), 0);
console.log('sync');
```

`sync` always prints first. A zero delay means "as soon as possible after the current work", never "now".

## The phases of one loop iteration

| Phase | Runs |
| --- | --- |
| **timers** | `setTimeout` and `setInterval` callbacks whose time has come |
| **pending callbacks** | Some deferred system callbacks (for example certain TCP errors) |
| **poll** | Waits for and runs I/O callbacks: file reads, incoming sockets, HTTP requests |
| **check** | `setImmediate` callbacks |
| **close callbacks** | `'close'` events such as `socket.on('close')` |

The loop goes round while anything can still produce a callback (a timer, an open server, a pending request). When nothing is left, the process exits. That is why a script with a `setInterval` never ends, and why `timer.unref()` exists.

## Microtasks and process.nextTick

Two queues sit **outside** the phases and are drained after every single callback (and after the main script):

1. The **nextTick queue**: `process.nextTick(fn)`. Node-specific.
2. The **microtask queue**: promise reactions (`.then`, code after `await`) and `queueMicrotask(fn)`. Same as the browser.

In a CommonJS script, the nextTick queue drains first, then the microtask queue; if either adds work to the other, Node keeps alternating until both are empty. Only then does the loop move to the next callback or phase.

```ts
setTimeout(() => console.log('timeout'), 0);
Promise.resolve().then(() => console.log('promise'));
process.nextTick(() => console.log('tick'));
console.log('sync');
```

Output: `sync`, `tick`, `promise`, `timeout`.

Code after `await` is a microtask too:

```ts
async function load() {
  console.log('load start');
  await null;
  console.log('load end');
}
```

`load start` runs synchronously when you call `load()`. `load end` is queued, so any synchronous code after the call runs before it.

> ES modules are evaluated asynchronously, so at the top level of an ESM file the promise queue can run before `nextTick`. Do not write code whose correctness depends on that ordering.

## setImmediate vs setTimeout(fn, 0)

From the main script, their order is **not deterministic**: it depends on how fast the process starts the first loop iteration. Inside an I/O callback it is: the poll phase is followed by the check phase, so `setImmediate` always runs before a zero timeout, which has to wait for the next timers phase.

`setImmediate` is the tool to say "after pending I/O"; `process.nextTick` means "before anything else", and recursive `nextTick` calls can starve I/O completely. Prefer `queueMicrotask` or promises unless you are writing a library that needs `nextTick`'s exact semantics (for example emitting an event after the caller attached listeners).

## Blocking the loop

Timers are a **minimum** delay. If synchronous code keeps the thread busy, nothing else runs:

```ts
const start = Date.now();
setTimeout(() => console.log(`fired after ${Date.now() - start} ms`), 10);
while (Date.now() - start < 200) {}
```

The timer fires after about 200 ms, not 10. In a server, the same busy loop delays **every** request. Typical culprits: `JSON.parse` of huge payloads, synchronous crypto or compression, `readFileSync` in handlers, catastrophic regular expressions, and large sorts. The scaling module shows how to chunk work and measure event loop lag.

## Where the thread pool fits

Network I/O uses the OS's non-blocking sockets directly. File system calls, DNS lookups (`dns.lookup`), `crypto.pbkdf2`, `scrypt` and `zlib` run on **libuv's thread pool** (4 threads by default, `UV_THREADPOOL_SIZE`). Their callbacks still come back to the single JavaScript thread through the poll phase.

## How this runs in Dev Dojo

The in-browser runtime approximates the phases with the browser's own event loop: `nextTick`, promises and timers are close but not identical to Node. That is why this challenge asks you to **predict** orders as data instead of measuring them. Your predictions are checked against real Node behavior.

## When to choose it

You rarely choose the event loop; you choose how to schedule work on it. Use `await` and promises for sequencing. Use `setImmediate` (or `scheduler.yield()` from `node:timers/promises`) to yield between chunks of long work so I/O can proceed. Use `process.nextTick` only for library-level "after the current call stack" guarantees. Move CPU-heavy work to worker threads or another service instead of fighting the loop.

## Working with AI

Ask an assistant to explain an ordering bug by naming the queues ("which queue does each callback go to?"). When reviewing generated code, check:

- No `*Sync` file, crypto or compression calls inside request handlers.
- No unbounded synchronous loops over request-sized data.
- No code that depends on `setTimeout(fn, 0)` vs `setImmediate` ordering in the main module.
- Recursive `process.nextTick` or microtask loops that could starve I/O.
- Long jobs split into chunks that yield, or offloaded to workers.
