1. Treat one server render like one request: everything request-scoped, starting with the `QueryClient`, is created inside `renderOnServer`.
2. Fill the cache before rendering. `renderToString` cannot wait for data, so `prefetchQuery` has to finish first; then `useQuery` reads a cache hit and the HTML contains the products.
3. Turn the cache into plain data with `dehydrate`. That object is what a real server embeds in the page (for example in a `<script>` tag) next to the HTML.
4. Describe the provider, the `HydrationBoundary` and `App` once and reuse that tree on both sides, so the first client render produces exactly the server markup.
5. On the client, seed a fresh `QueryClient` through `HydrationBoundary` and adopt the DOM with `hydrateRoot` instead of rendering a new one.
6. Prevent the double fetch: hydrated data carries the server timestamp, and with the default `staleTime` of 0 it is already stale on mount. A `staleTime` on the query options keeps it fresh.
7. Verify with the tests: zero requests after hydration, same nodes, working buttons, and a second server render that fetches its own data.
