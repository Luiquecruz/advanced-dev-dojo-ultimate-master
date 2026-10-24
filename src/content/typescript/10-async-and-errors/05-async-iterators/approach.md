1. Delete the `everything` buffer from `paginate`.
2. Inside the `do...while` loop, fetch one page, `yield*` its items, then update the cursor.
3. Implement `take` with a result array, `for await` and a `break` once the array is full; handle `count <= 0` by returning early.
4. Implement `mapAsync` as an async generator that loops with `for await` and yields `await transform(value)`.
