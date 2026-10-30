Move server state across the network: fetch the products on the "server", ship the cache with the HTML and reuse it on the "client" so the first render does not refetch. Both sides live in `App.jsx` (the sandbox runs them in the same page, and the tests serialize the cache with `JSON.stringify` to simulate the network).

Already written: `App` (named export) reads `productsQueryOptions` with `useQuery`, shows `Loading products...` while pending, then a `Cart: {n}` counter (`data-testid="cart-count"`) and `<ul aria-label="Products">` with an `Add {name}` button per product. The default export is only the preview.

Your work:

- **`productsQueryOptions`**: add a `staleTime` of `60_000` so hydrated data counts as fresh and the client does not refetch it on mount.
- **`renderOnServer()`** (async, named export):
  - create a **new `QueryClient` for every call** (never a module-level client: on a real server it would leak one user's data into another user's page);
  - `await queryClient.prefetchQuery(productsQueryOptions)`;
  - `dehydrate(queryClient)` into `dehydratedState`;
  - render `<App />` inside `QueryClientProvider` and `HydrationBoundary` (with `state={dehydratedState}`) using `renderToString`;
  - return `{ html, dehydratedState }`. The HTML must already list the products.
- **`hydrateOnClient(container, dehydratedState)`** (named export): create a client `QueryClient`, build the **same tree** as the server (provider, `HydrationBoundary` with the received state, `App`) and attach it to the existing HTML with `hydrateRoot`. Return the root.

Requirements checked by the tests: no `/api/products` request during or right after hydration, no hydration mismatch errors, the server DOM nodes are reused and become interactive, and two server renders never share a cache.
