# Stacks and Queues

Stacks and queues are lists with a rule about **which end you take from**. That rule is the whole point: it encodes an ordering guarantee your code relies on.

| Structure | Rule | Operations | Backend uses |
| --- | --- | --- | --- |
| Stack | LIFO: last in, first out | `push`, `pop`, `peek` | rollback of completed steps, undo, depth-first traversal, parsers, the call stack itself |
| Queue | FIFO: first in, first out | `enqueue`, `dequeue`, `peek` | job queues, buffering work under load, breadth-first traversal, fair scheduling |

## Stacks: arrays already are one

`push` and `pop` work on the end of an array, so both are `O(1)` amortized:

```ts
const stack: string[] = [];
stack.push('create-user');
stack.push('send-email');
stack.pop();
```

The most useful backend stack is the **compensation stack**. A signup flow creates a user, provisions a workspace and charges a card. If the charge fails, you undo the steps that succeeded, newest first, because later steps depend on earlier ones:

```ts
const done: Step[] = [];
try {
  for (const step of steps) {
    await step.up();
    done.push(step);
  }
} catch (error) {
  while (done.length > 0) await done.pop()!.down();
  throw error;
}
```

This is the same LIFO order as database migrations rolling back, middleware unwinding after `await next()`, and `finally` blocks. Across services it is called a **saga**: each step has a compensating action because there is no distributed transaction.

## Queues: do not use `shift`

`array.shift()` removes the first element, so every remaining element moves down one slot. It is `O(n)`. Engines optimize small arrays, but for a queue that holds thousands of jobs the cost is real and unpredictable. A queue only needs to remember where its head is:

```ts
class Queue<T> {
  private items: T[] = [];
  private head = 0;

  enqueue(item: T) {
    this.items.push(item);
  }

  dequeue(): T | undefined {
    if (this.head === this.items.length) return undefined;
    const item = this.items[this.head];
    this.items[this.head++] = undefined as T;
    return item;
  }
}
```

Clearing the slot lets the garbage collector free the job. Without compaction the array keeps growing, so real implementations periodically drop the consumed prefix (`items = items.slice(head); head = 0` once `head` passes half the length), which keeps `dequeue` `O(1)` amortized. Alternatives: a ring buffer (fixed capacity array with wrapping indexes, used by `denque` and Node's own internal queues), two stacks, or a linked list (next lesson).

## Bounded queues and backpressure

An in-memory queue in a web server is a buffer between "requests arrive" and "work is done". If producers are faster than consumers, an unbounded queue grows until the process runs out of memory. Give it a **maximum size** and decide what happens when it is full: reject with `503`/`429`, drop the oldest item, or make the producer wait. Streams solve the same problem with `highWaterMark`.

## In memory versus durable

| | In-memory queue | Durable queue (BullMQ on Redis, pg-boss, SQS, RabbitMQ) |
| --- | --- | --- |
| Survives a restart or crash | no | yes |
| Shared by several instances | no | yes |
| Retries, delays, dead letters | you build them | built in |
| Latency | nanoseconds | a network round trip |

In-memory queues are right for work that can be lost (batching log lines, debouncing cache refreshes) or for coordinating tasks inside one request. Anything a user is waiting for (emails, payments, exports) belongs in a durable queue; the scaling module builds a job queue on top of these ideas.

## Complexity

| Operation | Stack on array | Queue with head index | Queue with `shift` |
| --- | --- | --- | --- |
| add | `O(1)` amortized | `O(1)` amortized | `O(1)` amortized |
| remove | `O(1)` | `O(1)` amortized | `O(n)` |
| peek | `O(1)` | `O(1)` | `O(1)` |

## When to choose it

Use a plain array as a stack whenever you need "undo in reverse order" or an explicit depth-first traversal. Use a queue class (or a small library such as `denque`) when items are consumed in arrival order and the queue can grow beyond a few hundred entries; `shift` on a short, bounded array is fine. When the work must survive restarts or be shared across instances, do not build a queue at all: use a durable one.

## Working with AI

Ask for "a FIFO queue with `O(1)` dequeue, bounded at N items" and say whether jobs may be lost on restart. Review generated code for:

- `shift()` or `splice(0, 1)` on a queue that can grow.
- No maximum size and no answer for "what happens when it is full".
- Rollback logic that undoes in the original order instead of reverse, or that also undoes the step that failed.
- A failing compensation that aborts the rest of the rollback.
- In-memory queues used for work that must survive a deploy.
