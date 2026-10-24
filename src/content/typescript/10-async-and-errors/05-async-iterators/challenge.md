The `paginate` helper downloads **every** page before yielding the first item, even when the caller only needs a few. Rewrite it as a lazy stream and add two helpers.

1. `paginate<T>(fetchPage: FetchPage<T>): AsyncGenerator<T, void, undefined>`
   - calls `fetchPage(null)` for the first page, then `fetchPage(nextCursor)` until `nextCursor` is `null`
   - yields every item in order
   - fetches the next page **only** after the consumer has taken every item of the current one
2. `take<T>(source: AsyncIterable<T>, count: number): Promise<T[]>` collects at most `count` values and stops iterating as soon as it has them (use `for await` with `break`).
3. `mapAsync<T, U>(source: AsyncIterable<T>, transform: (value: T) => U | Promise<U>): AsyncGenerator<U, void, undefined>` yields each value transformed, awaiting async transforms.

```ts
await take(paginate(fetchPage), 2);             // first two items, only one page requested
await take(mapAsync(paginate(fetchPage), (user) => user.name), 10);
```
