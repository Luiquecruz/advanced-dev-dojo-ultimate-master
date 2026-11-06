In `TokenCache`, add `private readonly SemaphoreSlim _refreshGate = new(1, 1);`. In `GetAsync`, return the token early if there is one, then `await _refreshGate.WaitAsync(cancellationToken);` and put the rest in `try { ... } finally { _refreshGate.Release(); }`.
---
Inside the `try`, check `_token` again: `_token ??= await issuer.IssueAsync(cancellationToken);`. The callers that waited at the semaphore while the first one was issuing now find the token and skip the issuer.
---
For `RunAllAsync`, create `new SemaphoreSlim(maxConcurrency, maxConcurrency)` and a local `async Task<T> RunOneAsync(Func<Task<T>> job)` that waits for a slot, `return await job();` and releases the slot in `finally`. Start `RunOneAsync` for every job, collect the tasks in a list and `return await Task.WhenAll(tasks);`.
