## You do not own server state

Client state (a modal, a theme, a draft) is owned by the browser: it is synchronous, and it is exactly what you last set. **Server state** is different:

- it is **owned remotely** and can be changed by other users, jobs or tabs at any moment;
- reading it is **asynchronous** and can fail;
- many components need the **same** data at the same time;
- whatever you hold is a **snapshot** that starts going stale the moment it arrives.

So the right question is not "where do I store the users?" but "how long do I trust my copy, and when do I refresh it?". That is the job of a **cache**.

## The classic anti-pattern

```jsx
const [users, setUsers] = useState([]);
useEffect(() => {
  fetch('/api/users').then((response) => response.json()).then(setUsers);
}, []);
```

Copy-paste this into three components and you get three requests, three loading states, no error handling, race conditions on fast navigation, data that never refreshes, and three copies that disagree after a mutation. Moving the copy into Redux or Zustand ("`usersSlice` with `isLoading`") centralizes it but still forces you to hand-write a cache: staleness, deduplication, retries, invalidation.

## Cache vocabulary

| Concept | Meaning | TanStack Query | RTK Query |
| --- | --- | --- | --- |
| **Key** | identity of a resource + its parameters | `queryKey: ['todos', { status }]` | endpoint name + serialized args |
| **Freshness** | how long data is trusted without refetching | `staleTime` (default `0`) | `keepUnusedDataFor` / `refetchOnMountOrArgChange` |
| **Garbage collection** | how long unused entries are kept | `gcTime` (default 5 min) | `keepUnusedDataFor` (default 60 s) |
| **Deduplication** | concurrent identical requests become one | automatic per key | automatic per endpoint + args |
| **Revalidation** | refetch in the background while showing old data | on mount, window focus, reconnect, interval | `refetchOnFocus`, `refetchOnReconnect`, polling |
| **Invalidation** | mark data stale after a write | `invalidateQueries({ queryKey })` | `providesTags` / `invalidatesTags` |

**Stale-while-revalidate** is the core UX idea: show cached (possibly stale) data instantly, refetch in the background, and swap in fresh data when it arrives. The user rarely sees a spinner twice.

## Document cache vs normalized cache

TanStack Query and RTK Query store **responses by key** (document cache): simple and predictable, but the same user can live in `['users']` and `['user', 3]`, so you invalidate related keys after a write. Apollo Client and Relay **normalize** GraphQL entities by id, so updating `User:3` updates every query that includes it, at the cost of schema knowledge and complexity. For REST, key-based caching plus deliberate invalidation is the common choice.

## Where server state lives in modern React

- **Query libraries** (TanStack Query, RTK Query, SWR) in client components.
- **Framework loaders and React Server Components**: data is fetched on the server per request and streamed as props; the client cache is often unnecessary for read-only pages.
- **Mutations** go through the cache API (`useMutation`, RTK mutations) or Server Actions, followed by invalidation or revalidation.

## Pitfalls

- Copying query data into `useState` or a store: a second source of truth that stops updating.
- `staleTime: 0` everywhere: correct but chatty; tune per resource (a list of countries can be fresh for hours).
- `staleTime: Infinity` without invalidation: fast but wrong after writes.
- Keys missing a parameter, so different filters share one entry.
- Treating "loading" as global state: it belongs to the query that is loading.

## When to use it / when not to

**Use a server cache** for anything fetched from an API: lists, details, search results, user profiles, permissions. Pick TanStack Query by default, RTK Query if the app is already on Redux Toolkit, and rely on framework data loading when pages are server rendered.

**Do not use it** for state the client owns: UI toggles, drafts, wizard steps, selections. Those go to local state, URL state or a small client store. And do not cache what must never be stale without a strategy: balances or stock levels need short `staleTime`, refetch on focus, or server push.
