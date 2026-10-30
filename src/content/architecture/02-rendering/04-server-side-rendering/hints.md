On the server, move the fetch from `ClientApp` into `handleRequest`: `await fetch('/api/products')`, then `renderToString(<App products={products} />)` and interpolate the result inside `<div id="root">...</div>`.
---
`JSON.stringify(data).replace(/</g, '\\u003c')` produces the escaped JSON. Add `<script id="__DATA__" type="application/json">${serializeData(products)}</script>` after `#root`.
---
In `hydrate`, `JSON.parse(document.getElementById('__DATA__').textContent)` gives the same products the server used. Pass them to `hydrateRoot(container, <App products={products} />)` and return the root. `ClientApp`, `useEffect` and `createRoot` can be deleted.
