1. Implement both loaders with `fetch`; make `postLoader` throw a `data(...)` error response with the HTTP status when the request fails.
2. Register the loaders, elements and the detail route's `errorElement` in the `routes` array under the root layout.
3. Replace the hardcoded arrays in `PostList` and `PostDetail` with `useLoaderData()`.
4. Show the pending indicator in `Layout` from `useNavigation().state`.
5. Distinguish 404 error responses from other errors in `PostError` with `isRouteErrorResponse`.
