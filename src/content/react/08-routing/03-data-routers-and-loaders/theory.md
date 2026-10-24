## Fetch on navigation, not on render

With declarative routes, each page fetches its own data in an effect. That has three problems:

1. **Waterfalls**: the request only starts after the component renders, and nested pages wait for their parents.
2. **Flashes of empty UI**: the new page appears first, then shows a spinner.
3. **Race conditions** when users click quickly, unless every effect aborts correctly.

**Data routers** move data loading into the route definition. When a navigation starts, the router runs the **loaders** of all matching routes **in parallel**, keeps the current page on screen, and only renders the new page once its data is ready.

## Defining routes as objects

```jsx
import { createBrowserRouter, RouterProvider } from 'react-router';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { path: 'posts', loader: postsLoader, element: <PostList /> },
      { path: 'posts/:postId', loader: postLoader, element: <PostDetail />, errorElement: <PostError /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
```

Create the router **once**, outside components. Tests and non-browser environments use `createMemoryRouter(routes, { initialEntries: ['/posts'] })`.

## Loaders

A loader receives `{ params, request }` and returns data, synchronously or as a Promise:

```jsx
export async function postLoader({ params, request }) {
  const response = await fetch(`/api/posts/${params.postId}`, { signal: request.signal });
  if (!response.ok) {
    throw data('Post not found', { status: response.status });
  }
  return response.json();
}
```

The component reads the result with `useLoaderData()`. No loading state, no effect, no `null` check: when the component renders, the data is there.

```jsx
function PostDetail() {
  const post = useLoaderData();
  return <h1>{post.title}</h1>;
}
```

`request.signal` is aborted when the user navigates away before the loader finishes, so stale requests are cancelled for you. Loaders can also `throw redirect('/login')` or `return redirect(...)` for auth checks.

## Errors

Anything thrown in a loader (or during render) renders the closest route's `errorElement` instead of its `element`. `data(body, { status })` (or a `Response`) creates an **error response** you can recognize:

```jsx
function PostError() {
  const error = useRouteError();
  if (isRouteErrorResponse(error) && error.status === 404) {
    return <h1>Post not found</h1>;
  }
  return <h1>Something went wrong</h1>;
}
```

Since the error element replaces only that route, parent layouts keep rendering.

## Pending UI

`useNavigation()` exposes the global navigation state: `'idle'`, `'loading'` (loaders running) or `'submitting'` (an action running). Show a progress bar in the root layout:

```jsx
function Layout() {
  const navigation = useNavigation();
  return (
    <main>
      {navigation.state === 'loading' && <p role="status">Loading...</p>}
      <Outlet />
    </main>
  );
}
```

During the initial load there is no previous page to keep; provide `hydrateFallbackElement` (or a `HydrateFallback` component) to render meanwhile.

## Beyond loaders

- **Actions**: `action({ request })` handles `<Form method="post">` submissions, then the router revalidates every loader automatically.
- **`useFetcher`**: call loaders and actions without navigating (like buttons, inline edits).
- **Streaming**: return un-awaited promises from a loader and read them with `<Await>` or React's `use()` inside `<Suspense>`.
- **Lazy routes**: `lazy: () => import('./route')` splits code per route.

## Effects vs loaders

| | `useEffect` fetch | Loader |
| --- | --- | --- |
| Starts | after render | at navigation start |
| Parallel for nested routes | no (waterfall) | yes |
| Race conditions | manual abort | handled by the router |
| Loading UI | per component | global `useNavigation` |
| Error UI | manual state | `errorElement` |
