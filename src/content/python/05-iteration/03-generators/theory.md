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

The consumer decides how much work happens. A generator hands out each item as soon as it exists, and it reads nothing more once the consumer stops asking.

## How it works

- `yield` anywhere in the body makes the whole function a generator function, even in a branch that never runs. The generator is an iterator: `iter(generator) is generator`, and it supports one pass.
- **The consumer drives the work.** Between two `next()` calls the generator does nothing. Code before the first `yield` (argument checks, opening a file) runs at the first `next()`, not at the call.
- `return` ends the generator, and so does reaching the end of the body; the caller sees `StopIteration`. `return value` stores `value` on the `StopIteration` (lesson 05); `for` and `list()` ignore it. So a generator function cannot also "return a list": `return ["a", "b"]` inside it ends the iteration with nothing yielded.
- Since Python 3.7 ([PEP 479](https://peps.python.org/pep-0479/)), a `StopIteration` that escapes inside a generator body becomes `RuntimeError: generator raised StopIteration`. A bare `next(source)` that hits the end of `source` therefore crashes the generator instead of ending it quietly. Use `return`, a `for` loop, or `next(source, default)`.
- Infinite generators are normal: `while True: yield ...` is safe as long as the consumer is bounded (`next`, `zip` with a finite input, `itertools.islice`, `break`). `list()`, `sorted()` and `sum()` on one never return.
- Order matters at the edges. Pulling an item and then deciding you already have enough loses that item from a shared iterator. Yield first, then check whether you are done.
- To make a **class** re-iterable, write its `__iter__` as a generator method: every `iter()` call creates a new generator with its own position.

## Common mistakes

**Collecting the results in a list and returning it.** The function reads its whole source before the caller gets the first item, keeps every item in memory, and never returns on an endless source. Slicing has the same cost: `list(items)[:count]` reads everything, then drops most of it.

```py
# wrong: every line is read and stored before the caller sees one
def non_empty(lines):
    result = []
    for line in lines:
        if line.strip():
            result.append(line)
    return result

# right: one line at a time, nothing is collected
def non_empty(lines):
    for line in lines:
        if line.strip():
            yield line
```

A second mistake is checking the count after pulling one more item than needed: on a shared iterator, that item is lost to the next reader.

## When to choose it

- **A generator function** when results come one at a time and the consumer may stop early, when the source is large or unbounded, or when each item depends on state built while reading (blocks, running counters, ids).
- **A list** when the caller needs `len()`, indexing or a second pass, or when the data is small and reused; `list(generator)` materializes on demand.
- **A plain function returning an inner generator** when arguments must be validated at call time: checks inside a generator body only run at the first `next()`.
- Avoid module-level counters for sequences; the generator's locals already give each call its own state.
