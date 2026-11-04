A generator is a two-way channel. `yield` is an expression: `received = yield outgoing` hands `outgoing` to the caller, pauses, and evaluates to whatever the caller passes to `send()` when it resumes the generator. `yield from sub` hands the whole conversation to another generator until it finishes.

```py
def highest():
    best = None
    while True:
        value = yield best            # hand out the current best, then wait for a value
        if best is None or value > best:
            best = value

tracker = highest()
next(tracker)          # prime: run to the first yield, which hands out None
tracker.send(3)        # 3
tracker.send(1)        # 3
tracker.send(8)        # 8
```

## Coming from TypeScript and JavaScript

JavaScript generators have the same channel: `gen.next(value)` is `send(value)`, `yield*` is `yield from`, `gen.throw(error)` is `throw()`, and `gen.return()` is closest to `close()`. Two habits break in translation.

**Priming.** The argument of the first `next(value)` in JavaScript is silently discarded. Python refuses it: `send(5)` on a just-started generator raises `TypeError: can't send non-None value to a just-started generator`. Call `next(gen)` (or `gen.send(None)`) first, to run the body to its first `yield`.

**Flattening.** `flat(Infinity)` descends only into arrays, so strings stay whole:

```ts
[1, ["ab", [2]]].flat(Infinity);          // [1, "ab", 2]
```

The usual Python port asks "is it iterable?" instead, and a `str` is iterable. `"ab"` yields `"a"`, and `"a"` yields `"a"` again, forever:

```py
def flatten(items):
    for item in items:
        if isinstance(item, Iterable):    # true for "ab", and for "a"
            yield from flatten(item)      # RecursionError
        else:
            yield item
```

Treat `str` and `bytes` as leaves explicitly.

## How it works

- **`yield from sub`** ([PEP 380](https://peps.python.org/pep-0380/)) runs `sub` to completion. Every value it yields goes straight to our caller, every `send()` and `throw()` is forwarded to it, `close()` on the delegating generator closes `sub` too, and the expression evaluates to `sub`'s **return value**. A hand-written `for x in sub: yield x` forwards neither `send()` nor `throw()` and loses the return value.
- **`return value`** in a generator raises `StopIteration` with `.value` set. Only `yield from` or a manual `next()` loop that catches `StopIteration` sees it; `for` and `list()` drop it.
- **`send(value)`** resumes the generator, makes the paused `yield` evaluate to `value`, and returns the next yielded value. `next(gen)` is `gen.send(None)`.
- **`close()`** raises `GeneratorExit` at the paused `yield`, so `finally` blocks run and the generator ends. Closing a generator that never started, or one that already finished, does nothing: a `finally` that was never entered does not run. A generator that yields while handling `GeneratorExit` makes `close()` raise `RuntimeError: generator ignored GeneratorExit`.
- **`throw(exception)`** raises the exception at the paused `yield`. The generator may catch it and yield again; otherwise it propagates to the caller.
- **`finally`** in a generator runs on exhaustion, on an error, on `close()`, and when an unfinished generator is garbage collected. That last case depends on the runtime, so callers that stop early should call `close()`.
- Each nesting level of a recursive generator is a live frame. Keep nesting depth well under the recursion limit (1000 by default).

> **Status as of November 2026:** since Python 3.13, a generator that catches `GeneratorExit` and returns a value makes `close()` return that value. The three-argument `throw(type, value, traceback)` form has been deprecated since Python 3.12; pass one exception instance.

## When to choose it

- **`yield from`** to delegate to a sub-generator or walk a recursive structure; it forwards values, `send()`, `throw()` and the return value correctly.
- **A generator primed and fed with `send()`** for a small stateful consumer, such as running statistics or a parser fed chunk by chunk. Prefer a class with named methods when there are several operations or when callers inspect the state.
- **A return value** for a summary that belongs to the whole run (rows processed, errors); read it through `yield from` or by catching `StopIteration`.
- **`try`/`finally`** in every generator that holds a resource, and `close()` (or `contextlib.closing`, module 06) at every call site that may stop early.
- Not for concurrency: `send()`-driven generators were Python's coroutines before `async def`, which module 10 covers.
