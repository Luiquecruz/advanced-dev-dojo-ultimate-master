Finish `ReliableConsumer` in `Program.cs`: the code that sits between the broker and your handler and turns at-least-once delivery into effectively-once processing.

`new ReliableConsumer(processed, handle, delay, maxAttempts, firstDelay)` receives everything it depends on:

- `processed`, the store of message ids that were handled successfully (in production, the inbox table). Several consumer instances share one store.
- `handle`, the business handler for one message.
- `delay`, the function that waits between attempts. Production passes `Task.Delay`; the tests pass a function that only records the durations, so nothing really sleeps.
- `maxAttempts` and `firstDelay`, the retry budget.

## `ConsumeAsync(envelope, cancellationToken)`

Returns what happened to the message:

- **`Duplicate`** when the store already contains `envelope.MessageId`. The handler is not called.
- **`Processed`** when the handler succeeds. Only then is the id added to the store.
- A **`PoisonMessageException`** from the handler means the message can never succeed: add the envelope to `DeadLetters` and return **`DeadLettered`** at once, with no retry and no delay.
- Any **other exception** is treated as transient: wait, then call the handler again. The waits double, starting at `firstDelay` (1 s, 2 s, 4 s, ...). After `maxAttempts` failed attempts in total, dead-letter the message instead of waiting again.
- An **`OperationCanceledException`** means the consumer is stopping: let it propagate, without retrying or dead-lettering.

A dead-lettered message is not marked as processed, so an operator can fix it and resubmit it with the same id.

`System.Threading` is already imported at the top of the file.
