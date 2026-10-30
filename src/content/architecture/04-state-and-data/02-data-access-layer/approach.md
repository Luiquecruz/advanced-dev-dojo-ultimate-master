1. Decide the layers before writing code: transport (`shared/api/client.js`), resource definitions per feature (`features/products/api.js`), and UI that only consumes queries.
2. Make the client the single place that knows the base URL, headers and how HTTP failures look. Map every non-2xx response to one typed error (`ApiError` with `status`) so the rest of the app never inspects raw responses.
3. Give the feature one query factory. Start with the root key and derive every other key from it, so a single prefix addresses the whole resource.
4. Wrap each entry in `queryOptions` so the key, the function and the freshness travel together and cannot be mismatched by callers.
5. Replace the inline `useQuery` object in the component with the factory call, add the Refresh button that invalidates the root key, and render the error state from the typed error.
6. Check the boundary: search the project for `fetch(` and make sure it only appears in the client.
