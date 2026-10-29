# Sorting and Binary Search

You will almost never implement a sorting algorithm on a backend, but you will write **comparators** every week and occasionally need to search sorted data fast: timestamps in a sliding-window rate limiter, ids behind a pagination cursor, price tiers, version lists. Binary search turns those lookups from `O(n)` into `O(log n)`: 20 steps for a million items.

## The built-in sort

`Array.prototype.sort` is `O(n log n)` (V8 uses TimSort, which is also fast on nearly sorted data) and has been **stable** since ES2019: items that compare equal keep their original order. Two traps:

```ts
[10, 9, 1].sort();
[10, 9, 1].sort((a, b) => a - b);
```

The first returns `[1, 10, 9]`: without a comparator, values are compared **as strings**. The second returns `[1, 9, 10]`. Also, `sort` **mutates** the array in place, which is a bug when the array is shared (a cached list, a function argument). Use `toSorted` (Node 20+) or copy first.

## Writing comparators

A comparator returns a negative number when `a` comes first, positive when `b` comes first, `0` when they tie. It must be consistent: returning a boolean (`a > b`) or random values gives engine-dependent garbage.

Multi-key sorting chains comparisons and falls through on ties:

```ts
const rank = { high: 0, normal: 1, low: 2 } as const;

const byPriorityThenAge = (a: Order, b: Order) =>
  rank[a.priority] - rank[b.priority] || a.createdAt - b.createdAt || a.id - b.id;
```

`||` moves to the next key only when the previous difference is `0`. Ending with a unique key (the id) makes the order **total**, so the output is deterministic everywhere, including in the database. For human text, use `a.localeCompare(b)` or a shared `new Intl.Collator('en')`; `<` compares UTF-16 code units, so `'Zoe' < 'adam'`.

## Sort where the data lives

`ORDER BY created_at DESC, id DESC LIMIT 20` on indexed columns beats fetching rows and sorting in Node, and is the only option when the table does not fit in memory. Sort in JavaScript data that is already in memory and reasonably small (merged results from several services, computed fields).

## Binary search

Binary search finds a position in a **sorted** array by halving the search range each step. The most useful variant is **lower bound**: the first index whose value is `>= target` (or the length if none is).

```ts
function lowerBound(sorted: readonly number[], target: number): number {
  let low = 0;
  let high = sorted.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (sorted[middle] < target) low = middle + 1;
    else high = middle;
  }
  return low;
}
```

The invariant: everything before `low` is `< target`, everything from `high` on is `>= target`. The range `[low, high)` shrinks until it is empty, so the loop always ends, and duplicates return the **first** equal element. With a lower bound you get everything else:

| Question | Answer |
| --- | --- |
| Does `x` exist? | `i = lowerBound(a, x)` and `a[i] === x` |
| How many values are `< x`? | `lowerBound(a, x)` |
| Values in `[from, to)` | `a.slice(lowerBound(a, from), lowerBound(a, to))` |
| Requests in the last 60 s (sorted timestamps) | `a.length - lowerBound(a, now - 60_000)` |
| Where to insert `x` keeping order | `lowerBound(a, x)` |

Searching objects works the same with a key function (`key(items[middle]) < target`), as long as the array is sorted **by that key**.

## Pitfalls

- **Unsorted input.** Binary search on unsorted data returns wrong answers silently. Sort once (`O(n log n)`) only if you will search many times; for a single lookup, a linear scan is cheaper.
- **Off-by-one loops.** Mixing `high = length - 1` with `low < high`, or `high = middle - 1` with a half-open range, skips elements or loops forever. Pick the half-open `[low, high)` form above and keep it.
- **Inclusive versus exclusive ranges.** Define `[from, to)` explicitly; it composes without overlaps (`[0, 10)`, `[10, 20)`), which matters for time windows and pagination.
- **Keeping data sorted.** Inserting into a sorted array is `O(n)` (elements shift). For frequent inserts and range queries, use a heap (min only), a balanced tree, a skip list (Redis sorted sets) or the database.

## Algorithms worth recognizing

| Algorithm | Time | Notes |
| --- | --- | --- |
| Merge sort | `O(n log n)` | stable, extra memory; basis of TimSort and external sorting of huge files |
| Quicksort | `O(n log n)` average, `O(n²)` worst | in place; used by many C libraries |
| Insertion sort | `O(n²)` | fast for tiny or nearly sorted arrays; TimSort uses it on small runs |
| Counting / radix sort | `O(n + k)` | integer keys in a small range |

## When to choose it

Use the built-in `sort`/`toSorted` with explicit, total comparators for in-memory data; push sorting to the database for large or paginated data. Use binary search when the same sorted data is queried many times (time windows, lookups by range, cursor positions); keep a `Map` instead when you only need exact-key lookups. If data changes constantly and must stay ordered, use a structure built for it (heap, sorted set, database index) instead of re-sorting arrays.

## Working with AI

Specify the sort keys, directions and the tie-breaker, and whether the input may be mutated. Review generated code for:

- `sort()` without a comparator on numbers, or a comparator that returns a boolean.
- `sort` on a shared array where `toSorted` was needed.
- Binary search on data that is not guaranteed to be sorted by the searched key.
- Loop bounds: half-open `[low, high)` used consistently, `(low + high) >>> 1` for the middle.
- Linear `filter` over sorted timestamps or ids where a lower bound would do.
