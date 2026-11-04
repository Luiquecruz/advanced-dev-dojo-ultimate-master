A function that contains `yield` is a **generator function**. Calling it runs none of its body: it returns a **generator**, an iterator whose frame is paused before the first line. Each `next()` resumes the frame until the next `yield`, hands out that value and pauses again, keeping every local variable.

```py
def countdown(start):
    print("starting")
    while start > 0:
        yield start
        start -= 1
    print("done")

timer = countdown(2)     # nothing printed yet
print(next(timer))       # starting, then 2
print(next(timer))       # 1
next(timer)              # done, then StopIteration: the function returned
```

## Coming from TypeScript and JavaScript

`function*` and `yield` are the same idea, with the same calling rule: calling either one returns a paused generator object. What breaks in translation is the **array-first habit**: collect results in an array and return it, or turn an iterable into an array before slicing it.

```ts
function take<T>(count: number, items: Iterable<T>): T[] {
  return Array.from(items).slice(0, count);   // reads every item, then drops most of them
}
```

```py
def take(count, items):
    return list(items)[:count]   # same cost: reads the whole source, never returns on an infinite one
```

A generator inverts the flow. It hands out each item as soon as it exists, and it reads nothing more once the consumer stops asking:

```py
def non_empty(lines):
    for line in lines:
        if line.strip():
            yield line           # one line at a time: nothing is collected
```

## How it works

- `yield` anywhere in the body makes the whole function a generator function, even in a branch that never runs. The generator is an iterator: `iter(generator) is generator`, and it supports one pass.
- **The consumer drives the work.** Between two `next()` calls the generator does nothing. Code before the first `yield` (argument checks, opening a file) runs at the first `next()`, not at the call.
- `return` ends the generator, and so does reaching the end of the body; the caller sees `StopIteration`. `return value` stores `value` on the `StopIteration` (lesson 05); `for` and `list()` ignore it. So a generator function cannot also "return a list": `return ["a", "b"]` inside it ends the iteration with nothing yielded.
- Since Python 3.7 ([PEP 479](https://peps.python.org/pep-0479/)), a `StopIteration` that escapes inside a generator body becomes `RuntimeError: generator raised StopIteration`. A bare `next(source)` that hits the end of `source` therefore crashes the generator instead of ending it quietly. Use `return`, a `for` loop, or `next(source, default)`.
- Infinite generators are normal: `while True: yield ...` is safe as long as the consumer is bounded (`next`, `zip` with a finite input, `itertools.islice`, `break`). `list()`, `sorted()` and `sum()` on one never return.
- Order matters at the edges. Pulling an item and then deciding you already have enough loses that item from a shared iterator. Yield first, then check whether you are done.
- To make a **class** re-iterable, write its `__iter__` as a generator method: every `iter()` call creates a new generator with its own position.

## When to choose it

- **A generator function** when results come one at a time and the consumer may stop early, when the source is large or unbounded, or when each item depends on state built while reading (blocks, running counters, ids).
- **A list** when the caller needs `len()`, indexing or a second pass, or when the data is small and reused; `list(generator)` materializes on demand.
- **A plain function returning an inner generator** when arguments must be validated at call time: checks inside a generator body only run at the first `next()`.
- Avoid module-level counters for sequences; the generator's locals already give each call its own state.
