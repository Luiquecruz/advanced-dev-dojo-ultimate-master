The starter is a SPA in disguise: the "server" sends an empty `#root` and the client fetches the products again after rendering from scratch. Turn it into server-side rendering with serialized data and hydration. Both sides live in `App.jsx` (the sandbox plays server and browser). `App({ products })` (default export) is done: a `Sort by price` toggle button (`aria-pressed`) and a `<ul aria-label="Products">` whose items read `Keyboard $120`.

**Server**

- `serializeData(data)` (named export): `JSON.stringify(data)` with every `<` replaced by `<` (the six characters backslash, `u`, `0`, `0`, `3`, `c`). `JSON.parse` turns it back into `<`, but the HTML parser can no longer see a `</script>` inside the JSON.
- `handleRequest(url)` (named export, async): fetch `/api/products` on the server, render `<App products={products} />` with `renderToString`, and return `{ status: 200, html }` where `html` is a full document starting with `<!DOCTYPE html>` that contains:
  - `<div id="root">` with the rendered app inside it,
  - `<script id="__DATA__" type="application/json">` with `serializeData(products)`,
  - the client bundle script (already in the starter).

**Client**

- `hydrate(container)` (named export): read the products from `document.getElementById('__DATA__')` (its `textContent`, parsed with `JSON.parse`), call `hydrateRoot(container, <App products={products} />)` and return the root.
- Hydration must adopt the server DOM (the same `<button>` and `<ul>` nodes), log no hydration mismatch, make `Sort by price` work, and make **no** request to `/api/*`. Do not use `createRoot`.

Tests mount the server HTML into the page, inject a product named `</script><script>alert(1)</script>` with `mockApi`, and count client requests during hydration.
