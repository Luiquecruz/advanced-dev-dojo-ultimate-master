## The double fetch

Server-side rendering (module 02) sends HTML that already contains the data. Combine it naively with a client cache and you pay twice: the server fetches the products to render the page, the browser hydrates, `useQuery` finds an empty cache, shows a spinner over content the user was already reading and fetches the same products again.

The fix is to treat the server cache as **data that travels with the HTML**:

1. **Server**: create a cache, fill it, render with it, serialize it.
2. **Network**: send the HTML and the serialized cache in the same response.
3. **Client**: seed a new cache with that state before the first render, then hydrate.

## Server: prefetch, render, dehydrate

```jsx
import { renderToString } from 'react-dom/server';
import { QueryClient, QueryClientProvider, HydrationBoundary, dehydrate } from '@tanstack/react-query';

export async function handleRequest() {
  const queryClient = new QueryClient();
  await queryClient.prefetchQuery(productsQueryOptions);
  const dehydratedState = dehydrate(queryClient);
  const html = renderToString(
    <QueryClientProvider client={queryClient}>
      <HydrationBoundary state={dehydratedState}>
        <App />
      </HydrationBoundary>
    </QueryClientProvider>,
  );
  return page(html, dehydratedState);
}
```

`prefetchQuery` runs the query and stores the result without throwing (errors are simply not cached). `dehydrate` turns the cache into a plain, serializable object (keys, data, timestamps). The page embeds it, typically as `<script>window.__STATE__ = ...</script>`, escaped to prevent script injection.

Because `prefetchQuery` takes the same `queryOptions` the components use (see the data access layer lesson), the server cannot fetch under a key the client does not read.

## Client: hydrate the cache, then hydrate the DOM

```jsx
const queryClient = new QueryClient();
hydrateRoot(
  container,
  <QueryClientProvider client={queryClient}>
    <HydrationBoundary state={window.__STATE__}>
      <App />
    </HydrationBoundary>
  </QueryClientProvider>,
);
```

`HydrationBoundary` writes new queries into the cache **during render**, so `useQuery` returns data on the very first client render, which matches the server HTML. Outside React you can call `hydrate(queryClient, state)` before rendering instead.

## `staleTime`: the second half of the fix

Hydrated data keeps the server's `dataUpdatedAt`. With the default `staleTime` of `0`, it is stale the moment it arrives, and `useQuery` refetches on mount anyway: no spinner this time, but a wasted request. Give the query (or the client's `defaultOptions`) a `staleTime` that matches how fresh the data must be, for example a minute. The SSR guide of TanStack Query recommends a non-zero default on the client for this reason.

## One QueryClient per request

The most dangerous SSR bug is a module-level client on the server:

```js
const queryClient = new QueryClient();

export async function handleRequest(request) { ... }
```

A server process handles many users. A shared cache serves user A's account page to user B, keeps every response in memory forever and turns `staleTime` into "the data the first visitor saw". Create the client **inside** the request handler. On the browser the opposite holds: create one client per app (in `useState` or a module) and keep it.

## Frameworks, loaders and Server Components

You rarely write this plumbing by hand:

- **Route loaders** (React Router framework mode, TanStack Start, Remix-style loaders) run on the server per request and can call `queryClient.ensureQueryData(options)` before rendering; the framework handles serialization.
- **Next.js App Router** prefetches in a Server Component and renders `<HydrationBoundary state={dehydrate(queryClient)}>` around client components. A per-request client comes from React's `cache()`.
- **React Server Components** can make the cache unnecessary for data that is only displayed: the server renders it and sends no data to hydrate. Keep the query cache for data the client must refetch, mutate, paginate or poll.

## Pitfalls

- Rendering before `await prefetchQuery` finishes: the HTML shows the loading state.
- Different trees on server and client (a missing provider or boundary): hydration mismatch.
- Non-JSON data (`Date`, `Map`) in the cache: serialize it explicitly or use the `serializeData` option.
- Dehydrating private data into a page that is cached by a CDN.

## When to choose it

Use prefetch plus dehydrate whenever an SSR or SSG page reads data that the client keeps working with through a query cache: lists that refetch, paginate or are invalidated after mutations. Prefer plain server rendering or Server Components for data that is only displayed, and skip SSR entirely for authenticated dashboards where SEO and first paint do not matter.
