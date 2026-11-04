A **generator expression** is a comprehension in parentheses: `(expression for item in items if condition)`. It builds a generator, not a list, so nothing is computed until a consumer pulls. As the only argument of a call, it needs no extra parentheses.

```py
orders = [{"id": 1, "total": 30}, {"id": 2, "total": 120}, {"id": 3, "total": 80}]

big = (order for order in orders if order["total"] > 100)   # nothing evaluated yet
print(next(big, None))                                     # {'id': 2, 'total': 120}
print(sum(order["total"] for order in orders))             # 230, no list in between
print(any(order["total"] > 100 for order in orders))       # True, stops at order 2
```

## Coming from TypeScript and JavaScript

```ts
const first = orders.filter((o) => o.total > 100)[0] ?? null;    // tests every order
const hasBig = orders.map((o) => o.total > 100).some(Boolean);   // evaluates every order first
```

`find` and `some` short-circuit, but chains of `filter` and `map` build whole arrays before the last step runs. The direct translation keeps that cost, because square brackets build a list:

```py
first = [o for o in orders if o["total"] > 100][0]    # tests every order, IndexError when none match
has_big = any([o["total"] > 100 for o in orders])      # the list is complete before any() sees it
```

Swap the brackets for parentheses and the same expressions become lazy: `next((o for o in orders if o["total"] > 100), None)` stops at the first match, and `any(o["total"] > 100 for o in orders)` stops at the first `True`.

> **Status as of November 2026:** ECMAScript 2025 added iterator helpers (`Iterator.prototype.map`, `filter`, `take`, `find`, `some`), which give JavaScript lazy chains over iterators. Array methods are still eager, and they are what most code ports from.

## How it works

- Creating a generator expression evaluates only the iterable of its first `for` clause: `(x for x in None)` raises `TypeError` at once, while `(missing_name for x in range(3))` fails only when iterated.
- It is **one-shot**. `sum(squares)` followed by `sum(squares)` returns `0` the second time, and two functions given the same generator share one position: the second continues where the first stopped.
- `next(generator, default)` returns the first item or `default`. Without `default` it raises `StopIteration`, which inside another generator becomes `RuntimeError`.
- **Short-circuit consumers**: `any` stops at the first truthy item, `all` at the first falsy one, `next` after one item, and `in` on an iterator consumes up to the match. With a generator, the items after that point are never computed. `sum`, `min`, `max` and `sorted` read everything, but a generator still keeps only one item in memory at a time.
- A match can be falsy (`0`, `""`, `[]`). Pass the fallback as `next`'s default; `next(gen, None) or default` replaces a real match of `0` with the default.
- Parentheses may be dropped only when the generator expression is the sole argument: `sorted(x for x in xs, reverse=True)` is a `SyntaxError` ("Generator expression must be parenthesized"); write `sorted((x for x in xs), reverse=True)`.
- A generator has no `len()` and prints as `<generator object <genexpr> ...>`. Materialize with `list(...)` when you need to look at the values.

## When to choose it

- **A generator expression** for a single pass into a consumer: `sum`, `any`, `all`, `min`, `max`, `next`, `"".join`, `dict(...)`, or a `for` loop.
- **`next((x for x in items if condition), default)`** for "first match or default"; never `[...][0]`.
- **A list comprehension** when you need the values twice, `len()`, indexing or to print them, or when the input must be read completely before something changes it.
- **A plain loop** when each item needs several statements or side effects; a generator expression with side effects hides when they run.
