Build the client router of a single-page application from scratch, with no router library. The pages and the route table in `App.jsx` are done; the router in `router.jsx` and the data fetching of `Products` are yours.

**`router.jsx`**

- `usePathname()` returns `window.location.pathname` and re-renders the component whenever it changes, both after `navigate(...)` and when the browser fires `popstate` (back and forward buttons). Use `useSyncExternalStore`.
- `navigate(path)` adds a history entry with `window.history.pushState` and notifies every `usePathname` subscriber (`pushState` does not fire `popstate` by itself).
- `Link({ to, children, ...rest })` renders `<a href={to}>` (so the link still works without JavaScript, can be opened in a new tab and is crawlable). On a plain left click it calls `event.preventDefault()` and `navigate(to)`. It does nothing special when the click has `ctrlKey`, `metaKey`, `shiftKey` or `altKey`, when `event.button !== 0`, or when the event was already prevented: the browser handles those (new tab, new window, download).

**`App.jsx`**

- `/` renders the `Home` heading, `/products` renders `Products`, any other path renders `Page not found`. The `<nav aria-label="Main">` with the `Home` and `Products` links stays mounted across navigations.
- `Products` fetches `/api/products` **in the browser** when it mounts. It shows `<p>Loading…</p>` (with the `…` character) until the response arrives, then `<ul aria-label="Products">` with one `<li>` per product name. Ignore the response if the component unmounted.

The tests check that a plain click is prevented and updates `window.location.pathname` without remounting the navigation, that modified clicks are not prevented, that a `popstate` event restores the previous page, and that `router.jsx` uses `history.pushState`, `popstate` and `preventDefault`.
