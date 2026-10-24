1. Identify why the fallback appears: `PostsTab` suspends on `use(fetchPosts())`, and an urgent update must commit something, so React shows the nearest fallback.
2. Import `useTransition` and read `[isPending, startTransition]` at the top level of `TabsApp`.
3. Wrap `setTab(nextTab)` inside `startTransition`. React now renders the Posts tab in the background and keeps the About tab committed until the data resolves.
4. Use `isPending` to render the `Switching...` status outside the `Suspense` boundary.
5. When the promise resolves, React finishes the transition: the posts replace the About tab and `isPending` becomes `false`.
