1. Run the starter's `GetAllAsync` in your head with three SKUs that each take a second: the `await` inside the loop waits for the first answer before the second request is even sent, so the total is the sum of the three waits. That is what the "starts every request" test catches.
2. Separate starting from waiting. Calling an async method starts it and hands you a task; `await` is the point where you wait. Collect the tasks first, then wait once for all of them.
3. For `TryGetAsync`, decide which failure is a normal answer (an unknown SKU) and which one is a real problem the caller must see. Catch only the first.
4. For the cache, notice that the method itself is not `async`: it returns a `ValueTask` directly, so a cache hit costs no task at all. Keep the asynchronous work in a separate `async Task` method and wrap it.
5. Check the failure path: store the price only after the await succeeded, so a failed load leaves nothing behind.
