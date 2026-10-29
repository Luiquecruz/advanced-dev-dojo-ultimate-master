# Heaps and Priority Queues

A queue serves items in arrival order. A **priority queue** serves the most important item first, whatever its arrival time. Backends need this all the time:

- a job scheduler runs the job whose `runAt` is earliest (delayed emails, retries with backoff);
- a worker takes `priority: 'high'` jobs before bulk exports;
- a dashboard shows the 10 slowest endpoints out of millions of requests;
- Dijkstra's shortest path, rate limiters and timer implementations (Node's own timers use a priority queue).

The two operations are **insert** and **remove the minimum** (or maximum). Sorting the whole array after each insert costs `O(n log n)` per insert; scanning for the minimum on each removal costs `O(n)`. A **binary heap** does both in `O(log n)`.

## The binary heap

A binary heap is a complete binary tree stored in a plain array, with one rule: **every parent comes before its children** (for a min-heap, `parent <= child`). Siblings are not ordered, so the array is not sorted, but the first element is always the minimum.

```txt
index:   0  1  2  3  4  5
value:   2  5  3  9  6  4

            2
          /   \
         5     3
        / \   /
       9   6 4
```

No pointers are needed: for the item at index `i`, the parent is at `Math.floor((i - 1) / 2)` and the children at `2i + 1` and `2i + 2`.

**Push (sift up).** Append the item at the end, then swap it with its parent while it should come before the parent. At most one swap per level: `O(log n)`.

**Pop (sift down).** Remember the root (the answer), move the last item to the root, then swap it with its **smaller child** while that child should come before it. Again `O(log n)`.

```ts
private siftDown(index: number) {
  const { items } = this;
  while (true) {
    const left = 2 * index + 1;
    const right = left + 1;
    let first = index;
    if (left < items.length && this.compare(items[left], items[first]) < 0) first = left;
    if (right < items.length && this.compare(items[right], items[first]) < 0) first = right;
    if (first === index) return;
    [items[index], items[first]] = [items[first], items[index]];
    index = first;
  }
}
```

Taking a `compare(a, b)` function, with the same convention as `Array.prototype.sort` (negative means `a` first), makes one class serve every use: `(a, b) => a.runAt - b.runAt` for a scheduler, `(a, b) => b.priority - a.priority` for a max-priority queue.

## Top K without sorting everything

To find the 10 slowest requests among a million, sorting is `O(n log n)` time and keeps all `n` items in memory. A **min-heap of size k** is better: push each item and, whenever the heap holds more than `k`, pop the smallest. The heap always contains the `k` largest items seen so far, so this works on a stream in `O(n log k)` time and `O(k)` memory.

## Complexity

| Operation | Sorted array | Unsorted array | Binary heap |
| --- | --- | --- | --- |
| insert | `O(n)` (shift elements) | `O(1)` | `O(log n)` |
| peek min | `O(1)` | `O(n)` | `O(1)` |
| remove min | `O(1)` from the end | `O(n)` | `O(log n)` |
| build from n items | `O(n log n)` | `O(n)` | `O(n)` (heapify) |

## Pitfalls

- **Not stable.** Two jobs with the same priority can come out in any order. If FIFO among equals matters, add a sequence number and compare it as a tie-breaker.
- **Comparator mistakes.** `a.priority > b.priority` returns a boolean, not a number; `(a, b) => a - b` gives a min-heap, `b - a` a max-heap. Test both directions.
- **Changing priorities in place.** Mutating an item's key while it is inside the heap breaks the heap property. Remove and re-insert, or push a new entry and skip stale ones when popped (lazy deletion).
- **In-memory only.** A heap of delayed jobs dies with the process. Durable schedulers (BullMQ delayed jobs use a Redis sorted set, pg-boss uses an indexed `start_after` column) are the same idea stored outside the process.

## When to choose it

Use a heap when you repeatedly need the minimum or maximum of a **changing** collection: schedulers, "next timer to fire", merging sorted streams, top-K over large or streaming data. If you only need the order once, `sort` is simpler and fast. If the collection is small (dozens of items), a linear scan is fine. If the data is in a database, `ORDER BY ... LIMIT k` on an indexed column already does a top-K. For production queues, use a library (`@datastructures-js/priority-queue`, `tinyqueue`) or a durable job system rather than a hand-rolled heap.

## Working with AI

Ask for "a binary min-heap with a comparator, `O(log n)` push and pop" and say whether ties need FIFO order. Review generated code for:

- `sort` called inside `push`, or a scan for the minimum inside `pop` (both defeat the point).
- Off-by-one index formulas (`2i + 1`, `2i + 2`, `(i - 1) >> 1`).
- `pop` on a single-item heap: it must return the item and leave the heap empty.
- Sift-down that compares with only one child.
- Top-K that sorts the full list when the input is large or streamed.
