# Async Iterators and Generators

Backends constantly consume data that arrives **in pieces**: pages from a paginated API, rows from a database cursor, lines of a file, chunks of a stream, messages from a queue. Loading everything into an array first wastes memory and time to first result. Async iteration lets you write a plain `for await` loop over data that is fetched lazily, one piece at a time.

## The protocols in one minute

An **iterable** has a `[Symbol.iterator]()` method returning an iterator whose `next()` gives `{ value, done }`. Arrays, `Map`, `Set` and strings are iterables, which is why `for...of` works on them.

An **async iterable** has `[Symbol.asyncIterator]()`, and its `next()` returns a **promise** of `{ value, done }`. You consume it with `for await...of`:

```ts
import { createReadStream } from 'node:fs';

async function countBytes(path: string) {
  let total = 0;
  for await (const chunk of createReadStream(path)) {
    total += chunk.length;
  }
  return total;
}
```

Node streams, `events.on(emitter, 'name')`, `fs.promises.opendir`, database cursors in most drivers and many SDK paginators are async iterables.

## Generators write iterators for you

Writing `next()` by hand is tedious. A **generator** function (`function*`) pauses at each `yield` and resumes when the consumer asks for the next value. An **async generator** (`async function*`) can also `await` between yields:

```ts
async function* countdown(from: number) {
  for (let n = from; n > 0; n--) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    yield n;
  }
}

async function main() {
  for await (const n of countdown(3)) {
    console.log(n);
  }
}
```

Key properties:

- **Lazy**: nothing runs until the consumer calls `next()` (the first iteration of the loop). Creating the generator does no work.
- **Pull-based**: the generator only produces the next value when asked, so a slow consumer naturally slows the producer. That is backpressure for free.
- **`yield*`** delegates to another iterable: `yield* page.items` yields each item of an array.
- **Early exit**: when the consumer `break`s, `return`s or throws inside `for await`, the generator's `return()` is called and its `finally` blocks run. That is where you release a connection or close a file.

## Paginated APIs as a stream of items

Most APIs paginate with a cursor: each response holds a page of items and the cursor for the next page, `null` at the end.

```ts
async function* allOrders(client: OrdersClient) {
  let cursor: string | null = null;
  do {
    const page = await client.list({ cursor, limit: 100 });
    yield* page.items;
    cursor = page.nextCursor;
  } while (cursor);
}

async function reviewLargeOrders(client: OrdersClient) {
  for await (const order of allOrders(client)) {
    if (order.total > 1000) {
      await flagForReview(order);
    }
  }
}
```

The consumer sees a flat sequence of orders and never deals with pages. Only one page lives in memory, the next page is requested only when the previous one is consumed, and stopping early stops fetching.

## Composing async iterables

Small helpers turn generators into pipelines, the same idea as RxJS operators or array methods, but lazy:

```ts
async function* filter<T>(source: AsyncIterable<T>, keep: (item: T) => boolean) {
  for await (const item of source) {
    if (keep(item)) {
      yield item;
    }
  }
}
```

Useful building blocks: `take(n)` to stop early, `chunk(size)` to group items for bulk inserts, `map` and `filter`. The TC39 iterator helpers (`.map`, `.filter`, `.take` on sync iterators) shipped in Node 22; async iterator helpers are still a proposal, and Node streams offer `readable.map(fn, { concurrency })`, `filter`, `take` and `toArray` in the meantime.

## Pitfalls

- **Sequential by nature**: `for await` processes one item at a time. For parallelism, group items with `chunk` and process each group with a concurrency limit.
- **Collecting everything**: `Array.fromAsync(source)` or pushing into an array throws away the memory benefit; do it only for small sources.
- **Errors**: a rejection inside the generator surfaces at the consumer's `for await` as a thrown error, so `try/catch` around the loop works. Pages already yielded have already been processed.
- **Consuming twice**: a generator object can be iterated only once. Call the generator function again for a fresh sequence.

## When to choose it

Use async generators whenever data arrives in pages, chunks or events and the consumer may not need all of it, or all of it does not fit in memory comfortably: API pagination, exports, file processing, queue consumers. Use a plain `Promise<T[]>` for small, bounded results where simplicity wins. For byte-oriented data with backpressure across several stages (compress, upload), use Node streams and `pipeline` (the core APIs module); they are async iterables too, so both models mix.

## Working with AI

Ask for "an async generator that yields items across pages, fetching the next page only when needed". When reviewing generated code, check:

- Pagination follows the cursor until it is `null`, with no off-by-one that skips or repeats the last page.
- The code does not load all pages into one array before processing.
- Cleanup (closing cursors, connections) lives in `finally` so early `break` releases resources.
- Errors propagate to the consumer instead of being swallowed inside the generator.
- Per-item `await` inside `for await` is acceptable for the throughput needed; otherwise items are chunked and processed with a limit.
