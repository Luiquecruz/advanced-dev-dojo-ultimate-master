1. Read the starter's `with_deadline`: write down what happens to the work after `asyncio.wait` gives up on it, then pick the asyncio API that cancels it instead.
2. List every `await` in the worker. Cancellation can arrive at each of them: while waiting on the inbox and while a job runs.
3. For each handler in the worker, ask whether it matches `CancelledError`. Keep the one that catches job failures and lets cancellation through.
4. Decide where `"cleanup"` is recorded so it runs once, on every way out of the loop, without stopping the cancellation.
5. For the commit, separate two lifetimes: the caller, which may be cancelled, and the commit task, which must finish. Shield the second from the first.
6. Ask who references the commit task after the caller is gone, and make sure something does until the task completes.
