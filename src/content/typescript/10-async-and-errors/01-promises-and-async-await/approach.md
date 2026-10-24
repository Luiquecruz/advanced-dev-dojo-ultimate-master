1. Declare `let timer: number | undefined` so both the executor and `finally` can see it.
2. Build `timeout` as a `Promise<never>` whose executor schedules `reject(new Error(...))` after `ms` milliseconds.
3. Return `await Promise.race([promise, timeout])` inside `try`, and clear the timer in `finally`.
4. In `loadDashboard`, replace the two sequential `await`s with one `await Promise.all([...])` and destructure the tuple.
5. Leave the mapping to `userName`, `orderCount` and `revenue` unchanged.
