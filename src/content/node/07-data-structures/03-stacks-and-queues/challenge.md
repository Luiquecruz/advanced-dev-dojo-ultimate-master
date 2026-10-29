Two building blocks of a provisioning service: a FIFO queue for incoming jobs and a rollback runner for multi-step operations.

## `Queue<T>`

| Member | Behavior |
| --- | --- |
| `enqueue(item: T): void` | adds an item at the back |
| `dequeue(): T \| undefined` | removes and returns the front item, `undefined` when empty |
| `peek(): T \| undefined` | returns the front item without removing it |
| `size` (getter) | number of items currently queued |

`dequeue` must be `O(1)` (amortized): do **not** use `Array.prototype.shift` anywhere in the file. The tests push and pop 200 000 items.

## `runSteps(steps)`

```ts
interface Step {
  name: string;
  up: () => void | Promise<void>;
  down: () => void | Promise<void>;
}
async function runSteps(steps: Step[]): Promise<string[]>
```

1. Run every `up` in order, awaiting each one. On success, resolve with the names of the steps, in order.
2. If an `up` throws (or rejects), run the `down` of every step that **completed**, newest first, awaiting each one. The failing step's own `down` is not called and later steps never start. Then reject with the **original** error.
3. If a `down` throws during the rollback, log it with `console.error` and keep rolling back the remaining steps.
