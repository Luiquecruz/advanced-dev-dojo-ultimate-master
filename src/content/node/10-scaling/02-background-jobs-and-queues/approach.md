1. Model the three places a job can be: waiting in the FIFO list, running (counted by `running`), or scheduled for a retry (counted by `scheduled`). The queue is idle only when all three are empty.
2. Make `drain` the only place that starts jobs. Call it after `add`, after every job settles, and when a retry becomes due, so slots are refilled as soon as they free up.
3. Start jobs without awaiting them inside `drain`; awaiting would serialize everything and ignore `concurrency`.
4. In `run`, count the attempt before calling the handler so the handler can see which attempt it is (useful for logging and idempotency decisions).
5. On failure, choose between retry and dead letter by comparing `attempts` with `maxAttempts`. Schedule the retry with a timer instead of sleeping inside `run`, so the slot is released while the job waits.
6. Release the slot in `finally` and drain again; then resolve the `onIdle` waiters whenever `drain` finds the queue idle.
