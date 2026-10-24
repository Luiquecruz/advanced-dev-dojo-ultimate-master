## The cache is the store

Once server data lives in TanStack Query, the `QueryClient` **is** your server store. You do not copy data out of it; you design **keys** the way you would design a store's shape, read **projections** with `select`, and express **dependencies** between requests declaratively. This lesson assumes you know `useQuery`, `staleTime` and `queryOptions`.

## Key factories

Keys are the cache's addressing scheme. Ad-hoc keys (`['user-3']`, `['admins']`) multiply entries and make invalidation guesswork. Build them from a root instead:

```js
export const userKeys = {
  all: ['users'],
  list: () => [...userKeys.all, 'list'],
  search: (term) => [...userKeys.all, 'search', term],
  detail: (id) => [...userKeys.all, 'detail', id],
};
```

Filters match by **prefix**, so `invalidateQueries({ queryKey: userKeys.all })` refreshes every user query, while `userKeys.detail(3)` targets one entry. Pair keys with their functions and freshness in `queryOptions` factories, so callers cannot mismatch them:

```js
export const usersListOptions = () =>
  queryOptions({ queryKey: userKeys.list(), queryFn: fetchUsers, staleTime: 60_000 });
```

## `select`: one request, many projections

```jsx
const { data: count } = useQuery({ ...usersListOptions(), select: (users) => users.length });
const { data: admins } = useQuery({
  ...usersListOptions(),
  select: (users) => users.filter((user) => user.role === 'admin'),
});
```

Both observers share one cache entry and one request. `select` runs per observer, and the component re-renders only when **its** selected result changes (results are compared with structural sharing). Keep `select` functions stable (module level or `useCallback`) when they are expensive.

## Dependent queries

When a request needs the result of another, disable it until its input exists. `skipToken` is the type-safe way:

```jsx
import { skipToken, useQuery } from '@tanstack/react-query';

const { data: author } = useQuery({
  queryKey: userKeys.search(name),
  queryFn: () => searchUsers(name),
  select: (users) => users[0] ?? null,
});

const posts = useQuery({
  queryKey: ['posts', { userId: author?.id }],
  queryFn: author ? () => fetchPosts(author.id) : skipToken,
});
```

Dependent queries form a **waterfall**, which is slow. When you can, ask the API for a single endpoint, or move the chain to the server (loaders, Server Components).

## Seeding and smoothing

- `initialData: () => queryClient.getQueryData(userKeys.list())?.find((user) => user.id === id)` seeds a detail from the list cache: instant detail pages. Set `initialDataUpdatedAt` so freshness is computed correctly.
- `placeholderData: keepPreviousData` keeps showing the previous key's data while a new page or filter loads, without caching it under the new key.
- `queryClient.prefetchQuery(options)` on hover or in a route loader warms the cache before the component mounts.
- `useSuspenseQuery(options)` integrates with `<Suspense>` and error boundaries; `data` is never `undefined`.

## Reading the cache imperatively

`queryClient.getQueryData(key)`, `setQueryData(key, updater)` and `getQueriesData({ queryKey })` let event handlers and mutations read and patch the store without hooks. This is how optimistic updates (next lesson) work.

## Pitfalls

- Filtering raw data in render instead of `select`: works, but every change to the list re-renders all consumers.
- Forgetting a parameter in the key: two authors share one posts entry.
- `enabled: false` with a non-null key that later becomes `undefined`: prefer `skipToken`, which keeps types and intent explicit.
- Inline `select` doing heavy work on every render: extract and memoize it.
- Treating `isPending` of a disabled query as "loading": with `skipToken`, it means "waiting for input", so render the right message.

## When to use it / when not to

**Use these patterns** whenever several components read the same resource, when lists and details overlap, or when requests depend on each other. Key factories pay off as soon as you have more than a handful of queries and any invalidation at all.

**Do not** reach for `select` to build client state (selected rows, sort direction): that state belongs in the URL or local state and can be *combined* with query data in render. And avoid long client-side dependent chains when the backend or a server loader can return the data in one round trip.
