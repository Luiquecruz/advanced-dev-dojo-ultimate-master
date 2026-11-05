1. Count what the starter's `list(items)` holds when the consumers are slow, and why no queue size can help once everything has been pulled.
2. Sketch the pipeline as three roles: one producer, `workers` consumers, one bounded queue between them. Decide which `await` gives the backpressure and which one limits concurrency.
3. Bound the items in flight with a stuck handler: each consumer holds one item, the queue holds `queue_size`, and the producer holds the one it is trying to put.
4. Choose how the consumers learn there is no more work, and check that every task has finished when `run_pipeline` returns.
5. For `limited_gather`, place the semaphore so it surrounds the work itself, not the creation of the tasks.
6. For `SafeCounter`, write the interleaving of two increments with no lock and find the lost update. Then decide which awaits the lock must cover.
