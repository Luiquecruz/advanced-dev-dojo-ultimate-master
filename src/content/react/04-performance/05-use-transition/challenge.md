The `TabsApp` below has three tabs: **About**, **Posts** and **Contact**. The Posts tab reads `/api/posts` with `use()` and suspends while loading, so clicking **Posts** replaces the About tab with the `Loading tab...` fallback.

Make tab switches a transition:

- Get `[isPending, startTransition]` from `useTransition()`.
- Wrap the `setTab` call in `startTransition`.
- While the transition is pending, render `<p role="status">Switching...</p>` above the tabs content.

Expected behavior after clicking **Posts**:

- The About text (`Welcome to the Dojo blog.`) stays visible while the posts load, and `Loading tab...` is **not** shown.
- `Switching...` is visible while waiting.
- When the posts arrive, their titles are rendered, the About text is gone and the status disappears.

Keep the `aria-pressed` buttons, the `Suspense` boundary and the fallback text as they are.
