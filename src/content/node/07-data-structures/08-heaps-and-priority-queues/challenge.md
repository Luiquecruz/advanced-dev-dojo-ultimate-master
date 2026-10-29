Build the core of a delayed-job scheduler and a "slowest endpoints" report.

## `PriorityQueue<T>`

`new PriorityQueue<T>(compare)` where `compare(a, b)` returns a negative number when `a` must come out first (same convention as `Array.prototype.sort`). Implement it as a binary heap in an array.

| Member | Behavior |
| --- | --- |
| `push(item): void` | inserts in `O(log n)` |
| `pop(): T \| undefined` | removes and returns the item that comes first, `undefined` when empty, in `O(log n)` |
| `peek(): T \| undefined` | returns that item without removing it |
| `size` (getter) | number of items |

The tests push and pop 100 000 items and count how many times `compare` is called: sorting on every push or scanning on every pop is far too slow.

## `takeDue(queue, now)`

`queue` is a `PriorityQueue<{ id: string; runAt: number }>` ordered by `runAt`. Pop and return, in `runAt` order, every job with `runAt <= now`. Jobs that are not due stay in the queue.

## `topK(items, k, score)`

Return the `k` items with the highest `score(item)`, highest first (fewer when there are fewer items, `[]` when `k` is 0). `items` is any iterable, possibly a generator streaming a large log: keep at most `k` items at a time in a min-heap (your `PriorityQueue`) instead of collecting and sorting everything.
