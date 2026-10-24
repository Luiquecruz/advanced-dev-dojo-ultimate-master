## Loading states move up to boundaries

With `useQuery`, every component handles its own `isPending` branch. With **Suspense**, a component simply *assumes the data is there*. If it is not ready, the component **suspends**, and React shows the `fallback` of the nearest `<Suspense>` boundary above it.

```jsx
<Suspense fallback={<p>Loading profile...</p>}>
  <UserProfile userId={1} />
</Suspense>
```

```jsx
function UserProfile({ userId }) {
  const { data: user } = useSuspenseQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
  });
  return <h2>{user.name}</h2>;
}
```

There is no `isPending` check and `data` is **always defined**. Loading UI becomes a layout decision made by the parent, not boilerplate inside every component.

## What can suspend

Suspense only works with data sources that integrate with it:

- `useSuspenseQuery`, `useSuspenseQueries` and `useSuspenseInfiniteQuery` from TanStack Query.
- React's `use(promise)` with a **cached** promise (created outside render, for example in a loader or passed from a Server Component).
- Framework data APIs (Next.js, React Router), Relay, SWR with `suspense: true`.
- `lazy()` components.

Data fetched in `useEffect` **never** suspends: the effect runs after rendering, too late for Suspense.

### Why not `use(fetch(...))` in a component?

```jsx
function User({ id }) {
  const user = use(fetch(`/api/users/${id}`).then((r) => r.json()));
}
```

Each render creates a **new promise**, so React suspends again forever. Promises given to `use` must be cached across renders, which is precisely what a query cache does for you.

## Designing boundaries

Boundaries control **which parts of the UI appear together**. Everything inside one boundary is revealed at once, when all of it is ready.

```jsx
<Suspense fallback={<p>Loading profile...</p>}>
  <UserProfile userId={id} />
  <Suspense fallback={<p>Loading posts...</p>}>
    <UserPosts userId={id} />
  </Suspense>
</Suspense>
```

The outer boundary waits for the profile. The nested one lets the profile appear first while posts are still loading: **progressive reveal**. Too many boundaries produce a "popcorn" UI with spinners everywhere; too few make the whole page wait for its slowest part.

## Errors need error boundaries

When a suspense query fails, the error is **thrown** to the nearest error boundary instead of being returned as `isError`. Wrap boundaries with a class component implementing `getDerivedStateFromError` or with the popular `react-error-boundary` package, and use `QueryErrorResetBoundary` to let users retry.

```jsx
<ErrorBoundary fallback={<p role="alert">Something went wrong</p>}>
  <Suspense fallback={<Spinner />}>
    <UserProfile userId={id} />
  </Suspense>
</ErrorBoundary>
```

## Transitions keep old content on screen

Changing `userId` makes `UserProfile` suspend again and the fallback replaces the old profile. Wrapping the update in `startTransition` tells React to **keep showing the previous UI** until the new one is ready:

```jsx
const [isPending, startTransition] = useTransition();
<button onClick={() => startTransition(() => setUserId(2))}>Next user</button>;
```

## Pitfall: waterfalls

Two `useSuspenseQuery` calls **in the same component** run one after another: the first suspends, so the second line is not reached until it resolves.

```jsx
const { data: user } = useSuspenseQuery(userQuery(id));
const { data: posts } = useSuspenseQuery(postsQuery(id));
```

Fixes:

- `useSuspenseQueries({ queries: [userQuery(id), postsQuery(id)] })` starts both in parallel.
- Split them into sibling components, each with its own query.
- **Prefetch** before rendering: `queryClient.prefetchQuery(...)` in a route loader or event handler (render-as-you-fetch).

## History: from experiment to stable

Suspense shipped for `lazy()` in React 16.6 (2018). "Suspense for data fetching" stayed experimental for years; the `react-cache` package never left alpha. React 18 made Suspense work with concurrent rendering and streaming SSR, and React 19 added `use()` and official support for Suspense-enabled data sources. React 19 also commits a fallback as soon as a component suspends and then "pre-warms" the suspended siblings, so the order of components inside a boundary matters less than in the experimental days.

## When to use Suspense

Use it when you want loading states coordinated by layout, streaming server rendering, or framework integration. Keep `useQuery` with `isPending` for components that should render partial UI while loading, or that must never blank out.
