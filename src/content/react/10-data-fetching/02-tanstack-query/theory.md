## Server state needs a cache

Data from an API is a **snapshot of something you do not own**. It can go stale, several components may need it at once, and users expect it to refresh when they come back to the tab. TanStack Query (formerly React Query) is an async state manager built for exactly that: you describe *what* to fetch with a key and a function, and it handles caching, deduplication, background refetching, retries and garbage collection.

## Setup

Create one `QueryClient` (the cache) and provide it at the top of the app:

```jsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Todos />
    </QueryClientProvider>
  );
}
```

Create the client **outside** components (or in `useState(() => new QueryClient())`), otherwise every render throws the cache away.

## `useQuery`

```jsx
import { useQuery } from '@tanstack/react-query';

function Todos() {
  const { data, isPending, isError, error, isFetching } = useQuery({
    queryKey: ['todos'],
    queryFn: async () => {
      const response = await fetch('/api/todos');
      if (!response.ok) throw new Error('Failed to load todos');
      return response.json();
    },
  });

  if (isPending) return <p>Loading...</p>;
  if (isError) return <p role="alert">{error.message}</p>;
  return <ul>{data.map((todo) => <li key={todo.id}>{todo.title}</li>)}</ul>;
}
```

- **`queryKey`** identifies the data in the cache. It is an array and is hashed deterministically, so `['todos', { done: true }]` equals `['todos', { done: true }]`.
- **`queryFn`** returns a promise. It must **throw** to signal an error; remember that `fetch` does not throw on HTTP errors.
- **`isPending`**: no data yet. **`isFetching`**: a request is in flight, including background refetches while old data is shown.

## Keys are dependencies

Everything the query function uses goes into the key. When the key changes, a new cache entry is created and fetched; going back to a previous key shows the cached data instantly.

```jsx
useQuery({
  queryKey: ['posts', userId],
  queryFn: () => fetchPosts(userId),
});
```

Think of `queryKey` like the dependency array of `useEffect`, except that results are cached per key.

## Staleness and garbage collection

- **`staleTime`** (default `0`): how long data is considered fresh. Fresh data is served from the cache without refetching. Stale data is still shown, but refetched in the background on mount, window focus or reconnect (**stale-while-revalidate**).
- **`gcTime`** (default 5 minutes): how long *unused* cache entries are kept before being garbage collected.

```js
useQuery({ queryKey: ['users'], queryFn: fetchUsers, staleTime: 60_000 });
```

## Reusable options with `queryOptions`

Co-locate key and function so every caller uses the same pair, and get type inference in TypeScript:

```js
import { queryOptions } from '@tanstack/react-query';

export const postsQueryOptions = (userId) =>
  queryOptions({
    queryKey: ['posts', userId],
    queryFn: () => fetchPosts(userId),
    staleTime: 60_000,
  });

useQuery(postsQueryOptions(1));
queryClient.prefetchQuery(postsQueryOptions(2));
```

## Deduplication

If three components mount with the same key at the same time, **one request** is made and all three receive the result. This is why you can call `useQuery` wherever the data is needed instead of fetching once at the top and drilling props.

## Version notes: v4 to v5

- One object argument only: `useQuery({ queryKey, queryFn })`; positional `useQuery(key, fn)` was removed.
- `isLoading` was renamed **`isPending`** (and `status: 'loading'` became `'pending'`). `isLoading` now means `isPending && isFetching`.
- `cacheTime` was renamed **`gcTime`**.
- `onSuccess`/`onError` callbacks were removed from `useQuery`; derive in render or use effects.
- `keepPreviousData: true` became `placeholderData: keepPreviousData`.
- The package was renamed from `react-query` to `@tanstack/react-query` in v4.

## Pitfalls

- **Copying query data into `useState`** creates a second source of truth that stops updating. Use `data` directly.
- **Missing variables in the key** (`['posts']` for a query using `userId`) makes different users share one cache entry.
- **A new `QueryClient` per render** wipes the cache.
- In tests, create a fresh client per test with `retry: false`, otherwise errors are retried three times with backoff and tests time out.

## When to use it

Use TanStack Query (or SWR, RTK Query, or framework loaders) for all server state. Keep `useState` and stores for client state only.
