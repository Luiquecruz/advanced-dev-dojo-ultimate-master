## Iterating values that arrive over time

A regular iterator hands out values synchronously. Paginated APIs, file streams, WebSocket messages and database cursors produce values **asynchronously**. Async iteration mirrors the sync protocols with promises:

```ts
interface AsyncIterator<T, TReturn = any, TNext = any> {
  next(...[value]: [] | [TNext]): Promise<IteratorResult<T, TReturn>>;
  return?(value?: TReturn): Promise<IteratorResult<T, TReturn>>;
}

interface AsyncIterable<T> {
  [Symbol.asyncIterator](): AsyncIterator<T>;
}
```

You consume them with `for await...of`, which awaits each `next()` before running the loop body:

```ts
for await (const message of socketMessages()) {
  render(message);
}
```

## Async generators

`async function*` combines `await` and `yield`. It returns an `AsyncGenerator<T, TReturn, TNext>`, which is both an async iterator and an async iterable:

```ts
async function* ticks(count: number): AsyncGenerator<number, void, undefined> {
  for (let i = 1; i <= count; i++) {
    await delay(100);
    yield i;
  }
}
```

### A paginated API as one stream

The killer use case is hiding pagination. Consumers see a flat stream of items, and pages are fetched **only when the consumer needs more**:

```ts
async function* allUsers(): AsyncGenerator<User, void, undefined> {
  let cursor: string | null = null;
  do {
    const page = await api.listUsers({ cursor });
    yield* page.users;          // yield* also works with sync iterables here
    cursor = page.nextCursor;
  } while (cursor !== null);
}

for await (const user of allUsers()) {
  if (user.name === 'Grace') break; // later pages are never requested
}
```

## Breaking out runs cleanup

Leaving a `for await` loop early (`break`, `return` or an exception) calls the iterator's `return()` method. In an async generator that resumes the function as if `return` happened at the paused `yield`, so its `finally` blocks run:

```ts
async function* lines(file: FileHandle) {
  try {
    for await (const line of file.readLines()) yield line;
  } finally {
    await file.close(); // runs on break, too
  }
}
```

## Useful built-ins

- `Array.fromAsync(asyncIterable)` collects every value into an array (types in `lib.esnext`, supported by current browsers and Node).
- `for await` also accepts sync iterables of promises: `for await (const user of [p1, p2])` awaits each one in order.
- Node readable streams are async iterables, and so is the web `ReadableStream` in runtimes that implement its async iterator (Node, Deno, Firefox, Chromium), so `for await (const chunk of response.body)` works there.

## Legacy vs modern

Before ES2018, streams of async values were modelled with callbacks, event emitters (`on('data')`) or libraries such as RxJS. Those are push-based: the producer decides the pace. Async iterators are **pull-based**: the consumer asks for the next value, which gives natural back-pressure and plain `try`/`catch` error handling. Observables are still the better fit for multicasting UI events.

## Pitfalls

- `for await` processes values **sequentially**. To run independent async work in parallel, collect promises and use `Promise.all` instead.
- Collecting an infinite async generator with `Array.fromAsync` never finishes. Stop with `break` or a helper that takes the first N values.
- Forgetting `await` before `next()` gives you a promise, not an `IteratorResult`. TypeScript catches this when you read `.done`.
