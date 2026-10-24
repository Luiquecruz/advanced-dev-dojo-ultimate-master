Render a counter on the "server" and hydrate it on the "client". Everything lives in `App.jsx` (the sandbox runs both sides in the same page).

- `App({ initialCount = 0 })` (default export) is already written. It has a random id for the **Step** label and input that breaks hydration: make the id stable across server and client.
- `renderApp(initialCount)` (named export): return the HTML **string** for `<App initialCount={initialCount} />` using `renderToString`.
- `hydrateApp(container, initialCount)` (named export): attach React to the server HTML already inside `container` using `hydrateRoot`, and **return the root**. The existing DOM nodes must be reused (not replaced), and clicking the button must increment the count.
- Hydration must not log any mismatch error, and the `Step` label must stay linked to its number input.
