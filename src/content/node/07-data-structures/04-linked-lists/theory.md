# Linked Lists

A linked list stores each value in a **node** that points to its neighbors. There is no contiguous array and no index: you reach an element by following pointers. That sounds worse than an array, and for most work it is. The one thing a doubly linked list does better than anything else is **remove or move an element you already hold a reference to, in `O(1)`**.

```ts
class ListNode<T> {
  prev: ListNode<T> | null = null;
  next: ListNode<T> | null = null;
  constructor(public value: T) {}
}
```

A **singly** linked list has only `next`; a **doubly** linked list also has `prev`, which is what makes removal from the middle constant time. The list itself keeps `head`, `tail` and a `size` counter.

## Where it pays off on a backend

| Use case | Why a linked list |
| --- | --- |
| Idle-connection or session timeout list | connections ordered by last activity: touching one moves its node to the back, closing one removes its node, expiring walks from the front |
| LRU cache (next lesson) | the classic implementation: a `Map` from key to node plus a doubly linked list for recency |
| Timer wheels, Node's own internal timer lists | many insertions and cancellations by handle |
| Queues and deques | `O(1)` at both ends without reindexing |

The pattern is always the same: **something else holds the node** (a `Map`, the connection object, a timer handle), so you never have to search the list.

## Removing a node

```ts
remove(node: ListNode<T>): T {
  if (node.prev) node.prev.next = node.next;
  else this.head = node.next;
  if (node.next) node.next.prev = node.prev;
  else this.tail = node.prev;
  node.prev = node.next = null;
  this.size--;
  return node.value;
}
```

Four pointer updates, no matter how long the list is. The array equivalent, `items.splice(items.indexOf(value), 1)`, searches (`O(n)`) and then shifts every later element (`O(n)`). With 50 000 open connections closing in random order, that is over a billion steps of work versus 50 000.

## The invariant keeps expiry cheap

If every "activity" moves a connection's node to the tail, the list stays sorted by last activity: the head is always the oldest. Expiring idle connections then only looks at the nodes that actually expire:

```ts
while (list.head && now - list.head.value.lastSeen > maxIdleMs) {
  expired.push(list.shift()!);
}
```

No scan of the whole list, no sort. Designing the structure so the answer is always at one end is a recurring idea (heaps do the same for priorities).

## Costs and pitfalls

| Operation | Array | Doubly linked list |
| --- | --- | --- |
| access by index | `O(1)` | `O(n)` |
| push / pop at the end | `O(1)` amortized | `O(1)` |
| add / remove at the front | `O(n)` | `O(1)` |
| remove a known element | `O(n)` | `O(1)` with the node |
| find by value | `O(n)` | `O(n)` |
| memory per element | one slot | one object plus two pointers |
| cache locality | excellent | poor (nodes scattered in the heap) |

- **Pointer bugs are silent.** Forgetting to update `tail` when removing the last node, or `head` when removing the first, corrupts the list without an error. Test the edges: empty list, one node, head, tail.
- **Stale nodes.** Removing a node that belongs to another list, or removing it twice, corrupts `size`. Clear `prev`/`next` on removal and keep ownership clear.
- **Arrays usually win** for iteration and small collections, because contiguous memory is much faster for the CPU cache. Benchmarks often surprise people here.
- **JavaScript has an alternative:** `Map` and `Set` keep insertion order and delete in `O(1)`. "Delete then re-insert" moves a key to the end, which is often all you need (the LRU lesson shows where that trick stops scaling).

## When to choose it

Choose a doubly linked list when you must remove or reorder elements **by reference** many times in a large collection, and you need control over the order (timeout lists, LRU internals, schedulers). Choose a `Map`/`Set` when insertion order plus `O(1)` delete is enough: less code and no pointer bugs. Choose an array for everything else, especially when you iterate or access by position. In application code, prefer a tested library (`yallist`, `lru-cache`) over a hand-rolled list.

## Working with AI

Assistants rarely suggest a linked list on their own and sometimes produce one when a `Map` would do. Brief with the access pattern ("remove by handle when a connection closes, expire the oldest every second") and ask which structure fits. Review generated lists for:

- `head`/`tail` updates in every branch: first node, last node, only node.
- `size` kept in sync on every insert and removal.
- Removed nodes have `prev`/`next` cleared.
- No `O(n)` search hiding inside an operation that should be `O(1)`.
- Tests that cover the empty list and single-node cases.
