**Question this module answers:** when does work happen, who owns the iteration state, and when should a pipeline be lazy?

## Prerequisites

Module 02 (the sequence protocol and comprehensions), module 03 (closures and `nonlocal`) and module 04 (special methods on classes). A `for` loop is the only syntax you need; this module is about what it calls.

## The pieces

| Piece | What to know |
| --- | --- |
| Iterable | Anything `iter()` accepts: `list`, `dict`, `str`, `range`, files. A container hands out a **fresh** iterator each time, so it can be looped again; a file is its own iterator and reads once |
| Iterator | The cursor: `__next__` returns the next item or raises `StopIteration`, and `__iter__` returns itself. One pass only |
| Generator | An iterator written as a function with `yield`; its frame pauses between items |
| Generator expression | `(x for x in items)`: a one-shot generator in one line |
| `itertools` | Lazy building blocks: `islice`, `chain`, `groupby`, `batched`, `pairwise`, `accumulate` |

```py
orders = [10, 25, 40]
cursor = iter(orders)              # the cursor holds the position, not the list
print(next(cursor))                # 10
big = (amount for amount in orders if amount > 20)
print(sum(big), sum(big))          # 65 0: the generator is exhausted after one pass
```

A `break` inside a `for` loop only stops pulling. A generator left behind stays paused, holding whatever it opened, until it is closed or garbage collected (lesson 07).

## Reading the starters

The starters annotate their functions, and two forms are new here. `def take[T](count: int, iterable: Iterable[T]) -> Iterator[T]` declares a **type parameter** `T` in the square brackets: it stands for "the type of the items", so the signature says the iterator hands out items of the same type the iterable holds. `type Record = dict[str, str]` creates a **type alias**, a short name for a longer annotation, so later signatures can write `Record`. Neither form changes what the code does when it runs; module 09 covers them.

## The path

2. The iterator protocol: a re-iterable `Paginator` and a one-shot `LineReader`.
3. Generators: `yield`, suspended frames and infinite sequences.
4. Generator expressions and short-circuiting with `next`, `any` and `sum`.
5. `yield from`, `send`, `close` and the generator's return value.
6. `itertools` for batching, runs, running totals and transitions.
7. Lazy pipelines, the closing code challenge.
8. An ADR: batch size and passes for a large export, computed from a memory budget and a time window.

## When to choose it

The last practice lesson is a code challenge, and an ADR follows it: a log pipeline of generator stages that reads only what its consumer pulls and closes its source when it stops. The decision it trains: stay lazy when data is large, unbounded or only partly consumed; materialize into a list when you need a second pass, `len()` or indexing.
