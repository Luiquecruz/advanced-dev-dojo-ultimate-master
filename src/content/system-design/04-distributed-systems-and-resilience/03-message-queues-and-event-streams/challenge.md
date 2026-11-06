Build an in-memory at-least-once queue with a visibility timeout and a dead-letter list, and the idempotent consumer that makes its duplicate deliveries harmless. Time is injected through `now`, so nothing waits for real.

```ts
interface QueueOptions { visibilityTimeoutMs: number; maxReceives: number; now: () => number }
interface QueueMessage { id: string; body: unknown; receiveCount: number }

export function createQueue(options: QueueOptions): {
  send(body: unknown): string;
  receive(): QueueMessage | undefined;
  ack(id: string): boolean;
  deadLetters(): QueueMessage[];
}

export function createIdempotentConsumer(handler: (body: unknown) => void): {
  handle(message: { id: string; body: unknown }): boolean;
}
```

**`createQueue(options)`** starts empty. Each call has its own messages and ids.

- `send(body)` stores the message and returns its id: `'m1'`, `'m2'`, ... in send order. A new message is visible immediately.
- `receive()` delivers the visible message that was **sent first** and returns `{ id, body, receiveCount }`, where `receiveCount` counts its deliveries (1 the first time). The message stays in the queue but is hidden until `now()` reaches the receive time plus `visibilityTimeoutMs`; from that instant it is visible again and can be redelivered. Returns `undefined` when no message is visible.
- Before delivering a message that has already been received `maxReceives` times, `receive()` moves it to the dead letters instead (keeping its `receiveCount`) and continues with the next visible message.
- `ack(id)` deletes the message for good and returns `true`; it returns `false` when no message with that id is in the queue (already acknowledged, unknown or dead-lettered).
- `deadLetters()` returns the dead-lettered messages as `{ id, body, receiveCount }`, in the order they were moved.

**`createIdempotentConsumer(handler)`** remembers the ids it has processed. `handle(message)` calls `handler(message.body)` and returns `true` the first time it sees `message.id`, and returns `false` without calling the handler for an id it has already processed. When the handler throws, the error propagates and the id is **not** recorded, so a redelivery can try again.

The file ends with a small demo that the **Run** button prints.
