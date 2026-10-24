Loaders are plain async functions: `const response = await fetch(...); return response.json();`. Attach them to routes with the `loader` key.
---
For the 404: `if (!response.ok) throw data('Post not found', { status: response.status });`. The router catches it and renders the route's `errorElement`.
---
In components, `const posts = useLoaderData();`. In `Layout`, `const navigation = useNavigation();` and render the status while `navigation.state === 'loading'`. In `PostError`, combine `useRouteError()` with `isRouteErrorResponse(error) && error.status === 404`.
