Load a blog with a data router. The fake API serves `GET /api/posts` and `GET /api/posts/:id` (404 for unknown ids).

1. Export `postsLoader()`: fetch `/api/posts` and return the parsed JSON.
2. Export `postLoader({ params })`: fetch `/api/posts/{params.postId}`. If the response is not ok, **throw** `data('Post not found', { status: response.status })`. Otherwise return the JSON.
3. Export `routes` with a root route `/` rendering `Layout` (keep `hydrateFallbackElement`) and two children:
   - `posts`: `loader: postsLoader`, element `PostList`.
   - `posts/:postId`: `loader: postLoader`, element `PostDetail`, `errorElement: <PostError />`.
4. `Layout` renders `<p role="status">Loading...</p>` while `useNavigation().state === 'loading'`, followed by the `<Outlet />`.
5. `PostList` reads the posts with `useLoaderData()` and renders `<h1>Posts</h1>` and one `<Link to="/posts/{id}">` per post with its title.
6. `PostDetail` reads the post with `useLoaderData()` and renders `<h1>{title}</h1>`, `<p>{body}</p>` and `<Link to="/posts">Back to posts</Link>`.
7. `PostError` uses `useRouteError()`: when `isRouteErrorResponse(error)` and the status is 404, render `<h1>Post not found</h1>`; otherwise `<h1>Something went wrong</h1>`.

No `useEffect`: data comes from loaders.
