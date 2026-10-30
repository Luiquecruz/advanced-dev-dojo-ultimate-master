1. Treat the URL as an external store: React does not own it, so read it with `useSyncExternalStore` instead of copying it into state.
2. List every way the URL changes. The browser changes it on back/forward and announces it with `popstate`; your code changes it with `pushState`, which is silent. Subscribe to both: `popstate` plus a custom event dispatched by `navigate`.
3. Return a primitive snapshot (`pathname`), so React can compare snapshots with `Object.is` and skip renders when nothing changed.
4. Keep links as real anchors and intercept only what the router should own: an unmodified primary-button click that nobody prevented yet. Everything else belongs to the browser.
5. Route by looking up the pathname in a table and falling back to a not-found page. The shared `<nav>` sits outside the page, so it stays mounted across navigations, which is the visible difference from a full reload.
6. Fetch in `Products` after mount with an `ignore` flag in the cleanup, and model the loading state explicitly (`null` until the data arrives). This is the client-side waterfall the theory describes.
