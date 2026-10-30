The server side is three steps in order: `const queryClient = new QueryClient()` inside the function, `await queryClient.prefetchQuery(productsQueryOptions)`, then `const dehydratedState = dehydrate(queryClient)`. Only after that call `renderToString`, so `useQuery` finds the data already in the cache.
---
Write the tree once, for example a small `AppTree({ queryClient, dehydratedState })` component that renders `QueryClientProvider` > `HydrationBoundary state={dehydratedState}` > `App`. Use it in both functions: identical trees are what make hydration match.
---
On the client, `hydrateRoot(container, <AppTree queryClient={new QueryClient()} dehydratedState={dehydratedState} />)` replaces `createRoot`. If you still see a request after hydrating, the data is stale on arrival: `staleTime: 60_000` in `productsQueryOptions` keeps `useQuery` from refetching on mount.
