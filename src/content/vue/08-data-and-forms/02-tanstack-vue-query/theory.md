## Server state is different

Data that lives on a server is not *your* state: other users change it, it goes stale, and several components often need the same piece. Hand-written fetching (previous lesson) quickly needs caching, deduplication, retries, background refresh and invalidation after writes. **TanStack Query** (Vue Query) handles all of that so components just declare *what* they need.

## Setup

```ts
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000 } },
});
app.use(VueQueryPlugin, { queryClient });
```

The `QueryClient` holds the cache. `VueQueryPlugin` provides it to every component (`useQueryClient()` reads it).

## Queries

```ts
const { data, isPending, isError, error, isFetching, refetch } = useQuery({
  queryKey: ['todos'],
  queryFn: fetchTodos,
});
```

- **`queryKey`** identifies the data in the cache. Two components using `['todos']` share one request and one cache entry.
- **`queryFn`** returns a promise and must **throw** on failure (remember `fetch` does not reject on HTTP 500).
- Every returned field is a **ref** (`data.value` in script, unwrapped in templates).
- `isPending`: no data yet. `isFetching`: any request in flight, including background refetches.

### Reactive keys

Keys may contain refs or getters. When they change, Vue Query fetches the new key automatically:

```ts
const userId = ref(1);
const { data: posts } = useQuery({
  queryKey: ['posts', { userId }],
  queryFn: () => fetchPosts(userId.value),
  enabled: () => userId.value > 0,
});
```

No watcher, no AbortController bookkeeping: previous results stay cached per key.

### Freshness

- `staleTime` (default `0`): how long data counts as fresh. Stale data is still shown, but refetched in the background on mount, window focus or reconnect.
- `gcTime` (default 5 minutes): how long unused cache entries are kept.
- Failed queries retry 3 times by default. Disable it in tests (`retry: false`) to keep them fast.

## Mutations and invalidation

Writes use `useMutation`. After a successful write, mark affected queries as stale so they refetch:

```ts
const queryClient = useQueryClient();
const addTodo = useMutation({
  mutationFn: createTodo,
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['todos'] }),
});

addTodo.mutate('Write docs');
```

`invalidateQueries` matches by prefix: `['todos']` also invalidates `['todos', 5]`. Returning its promise from `onSuccess` keeps `isPending` true until the fresh list arrives. For instant UI you can instead update the cache with `queryClient.setQueryData(['todos'], (old) => [...old, todo])` or perform an optimistic update in `onMutate`.

## Version notes

TanStack Query v5 (the current major) uses a single object argument (`useQuery({ queryKey, queryFn })`; the positional `useQuery(key, fn)` form of v3/v4 was removed), renamed `cacheTime` to `gcTime`, and introduced `isPending` for "no data yet" (v4's `isLoading` now means `isPending && isFetching`). Older Vue 2 code may use `vue-query` (v1), the predecessor package.

## Alternatives

- **Pinia Colada**: a smaller data-fetching layer built on Pinia by the Vue core team, with `useQuery`/`useMutation` and integration with Vue Router 5 data loaders.
- **Nuxt `useFetch` / `useAsyncData`**: built-in, SSR-aware fetching in Nuxt apps.
- A hand-written composable is fine for one-off requests without caching needs.

## Pitfalls

- A `queryFn` that does not throw on HTTP errors makes failed responses look like data.
- Keys must include every variable the query depends on, otherwise different inputs share one cache entry.
- Creating a `QueryClient` inside a component creates a new cache on every mount; create it once at app level.
