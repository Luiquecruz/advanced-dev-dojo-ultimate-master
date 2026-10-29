# Big O in Practice

Big O describes how the cost of an operation **grows** with the size of its input. It ignores constants and hardware: it answers "what happens when this list goes from 1 000 to 1 000 000 items?". On the frontend, `n` is often a list of 50 rendered rows. On a backend, `n` is the number of users, orders or log lines, and it grows every day without anyone touching the code.

## The classes you will actually meet

| Class | Name | Backend example | 1 000 items | 1 000 000 items |
| --- | --- | --- | --- | --- |
| `O(1)` | constant | `map.get(id)`, `set.has(email)`, `array.push(x)` | 1 step | 1 step |
| `O(log n)` | logarithmic | binary search over sorted ids, B-tree index lookup | ~10 | ~20 |
| `O(n)` | linear | scanning every order once, `array.find`, `includes` | 1 000 | 1 000 000 |
| `O(n log n)` | linearithmic | `array.sort()`, building a sorted report | ~10 000 | ~20 000 000 |
| `O(n²)` | quadratic | a `find` inside a `map`, comparing every pair | 1 000 000 | 10¹² (hours) |
| `O(2ⁿ)` | exponential | trying every subset | unusable past ~30 | unusable |

The jump that hurts in practice is from `O(n)` to `O(n²)`. It is invisible in tests with 20 fixtures and becomes a timeout in production with 50 000 rows.

## Hidden loops in JavaScript

Most quadratic code in Node.js does not have two `for` loops. It hides a linear operation inside a loop:

```ts
const result = orders.map((order) => ({
  ...order,
  customer: users.find((user) => user.id === order.userId),
}));

const usersById = new Map(users.map((user) => [user.id, user]));
const fast = orders.map((order) => ({ ...order, customer: usersById.get(order.userId) }));
```

The first version is `O(orders × users)`; the second is `O(orders + users)`. Same output, one extra line. Other common hidden costs:

| Looks cheap | Actual cost | Typical fix |
| --- | --- | --- |
| `array.includes(x)` / `indexOf` / `find` | `O(n)` | a `Set` or `Map` built once |
| `array.shift()` / `unshift()` | `O(n)` in the general case (elements move) | a head index or a real queue |
| `array.splice(i, 1)` | `O(n)` | mark and filter once, or a linked structure |
| `{ ...acc, [key]: value }` inside `reduce` | `O(n)` per step, `O(n²)` total | mutate a local `Map` or object |
| `[...acc, item]` inside `reduce` | `O(n)` per step | `push` |
| `JSON.parse(JSON.stringify(x))` | `O(size)` plus allocations | `structuredClone` or no clone at all |

## Amortized cost and space

`array.push` is `O(1)` **amortized**: occasionally the engine reallocates and copies the backing store, but averaged over many pushes each one is constant. Hash maps behave the same way when they grow.

Big O also applies to memory. Loading a 2 GB export with `readFile` is `O(n)` space and crashes the process; streaming it line by line is `O(1)` space (the streams lessons). A cache without a size limit is an `O(requests)` memory leak.

## When n is small, or I/O dominates

Big O is about growth, not speed at a given size. Two practical corrections:

1. **Small, bounded n does not matter.** A `find` over the 5 roles of your app is fine forever. Ask "is n bounded?" before optimizing.
2. **I/O dwarfs CPU.** One database round trip costs ~1 ms, which is roughly a million simple JavaScript operations. Ten queries in a loop (the N+1 problem) is a bigger problem than any in-memory `O(n²)` over a few hundred items. Fix round trips first.

When in doubt, measure with realistic data (`performance.now()`, a quick benchmark with 10× the production size) instead of guessing.

## Databases are data structures too

An index on `users.email` is a B-tree: `O(log n)` lookups instead of an `O(n)` full table scan. The same reasoning you apply to a `Map` applies to your queries: a `WHERE` on an unindexed column in a table that grows is a hidden linear scan on every request.

## When to choose it

Think in Big O when the input is **unbounded and growing** (users, events, rows, files), when the code runs **per request** or in a hot loop, or when a job processes a whole table. Prefer the boring fix first: build a `Map`/`Set` once, sort once, move the work into the database with an index, or stream instead of loading everything. Skip the analysis for small fixed collections, one-off scripts and code dominated by network calls; there, readability wins.

## Working with AI

Assistants write correct but naive code: a `.find` inside `.map`, `.includes` inside `.filter`, spreads in `reduce`. When briefing, state the expected sizes ("orders can reach 200 000 rows, users 50 000") and ask for the complexity of the solution. Review checklist:

- Is there a linear call (`find`, `includes`, `indexOf`, `filter`, `some`) inside a loop or a `map`?
- Does a `reduce` copy its accumulator on every step?
- Is anything loaded fully into memory that could be streamed or paginated?
- Is there a database query inside a loop?
- Is a cache or array growing without a bound?
- Does the claimed complexity match the code, and is `n` actually large enough to care?
