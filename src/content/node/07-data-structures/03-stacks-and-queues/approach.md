1. Notice why `shift` is a problem: it removes index 0 and renumbers every remaining element, so a queue of `n` jobs pays `O(n)` per dequeue.
2. Keep the storage array append-only and track `head`, the index of the next item to leave. Enqueue is `push`, dequeue reads `items[head]` and moves `head` forward, peek reads without moving.
3. Clear consumed slots and periodically slice off the consumed prefix so memory does not grow forever; slicing only when `head` passes half the array keeps the cost amortized `O(1)`.
4. For `runSteps`, think about the order of undo: later steps depend on earlier ones, so they must be undone first. That is LIFO, a stack.
5. Push a step only after its `up` resolves, so the failing step is never on the stack and is not compensated.
6. In the `catch`, drain the stack with `pop`, awaiting each `down` inside its own `try/catch` that logs with `console.error`, then rethrow the original error so the caller sees why the operation failed.
