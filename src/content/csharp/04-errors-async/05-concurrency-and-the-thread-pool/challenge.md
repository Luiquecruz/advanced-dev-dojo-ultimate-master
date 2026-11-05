Finish two concurrency helpers in `Program.cs`, both built on `SemaphoreSlim`.

## `TokenCache`

`new TokenCache(issuer)` hands out an `AccessToken` from `ITokenIssuer.IssueAsync(cancellationToken)` and keeps it.

- `GetAsync(cancellationToken)` returns the cached token when there is one. Otherwise it gets a new one from the issuer and stores it.
- **Single flight:** callers that arrive while a token is being issued wait for that token; the issuer is called **once**, not once per caller. Guard the refresh with a `SemaphoreSlim(1, 1)`, wait with `WaitAsync(cancellationToken)`, and check again inside before calling the issuer.
- If the issuer throws, the exception reaches that caller, nothing is stored, and the **next caller can try again**: the semaphore is released in every case.
- A caller that is waiting for the refresh can give up with its own token (`OperationCanceledException`) without affecting the refresh in progress.
- `Invalidate()` drops the cached token, so the next callers (again, together) trigger exactly one new issue.

## `Limited.RunAllAsync(jobs, maxConcurrency)`

Runs every job (`Func<Task<int>>`, `Func<Task<string>>`, ...) and returns their results **in the order of `jobs`**.

- At most `maxConcurrency` jobs run at the same time, and up to that many do run together (the jobs must not run one by one).
- A `maxConcurrency` below 1 throws `ArgumentOutOfRangeException`.

The engine has no extra threads, and none are needed: all of this is asynchronous waiting.
