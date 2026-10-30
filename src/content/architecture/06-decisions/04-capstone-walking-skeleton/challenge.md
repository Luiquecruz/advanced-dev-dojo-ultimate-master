Deliver the final project for a store: the decisions in the four layers recorded as ADRs, a **walking skeleton** that implements one feature end to end, and the trade-offs. The sandbox runs the "server" and the "client" in the same page, so the server is a plain function.

```
App.jsx                         default App({ catalog }), ErrorPage({ title })   (done, fix the import)
features/catalog/index.js       public API of the catalog feature                (TODO)
features/catalog/ProductList.jsx, filterProducts.js                              (done, internal)
server/bff.js                   getCatalogViewModel()                            (TODO)
server/render.jsx               serializeForScript(value), handleRequest(url)    (TODO)
client.jsx                      readEmbeddedCatalog(container), hydrate(container) (TODO)
decisions/adrs.js               adrs: four ADRs, one per layer                    (TODO)
decisions/tradeoffs.js          tradeoffs: { outOfScope, risks }                 (TODO)
```

**Feature module.** `features/catalog/index.js` exports `ProductList`. No file outside `features/catalog/` may import (`from '...'` or `import('...')`) a file inside it other than its `index`: `App.jsx` imports from `'./features/catalog'`.

**BFF** (`server/bff.js`). `getCatalogViewModel()` fetches `/api/products` and returns exactly `{ products: [{ id, name, priceLabel }], count }`, where `priceLabel` is the price formatted as US dollars (`$120.00`; use the provided `priceFormatter`). It throws when the response is not ok.

**Server entry** (`server/render.jsx`). `handleRequest(url)` returns `{ status, html }`, where `html` is a full document starting with `<!DOCTYPE html>`:

- `/` → status `200`, the app rendered with `renderToString(<App catalog={viewModel} />)` inside `<div id="root">`, followed by `<script id="catalog-data" type="application/json">` holding the view model.
- `serializeForScript(value)` produces that JSON with every `<` replaced by `\u003c`, so a product named `</script>...` cannot close the tag. `JSON.parse` must still return the original data.
- Any other path → status `404` with `<ErrorPage title="Page not found" />`, **without** calling the BFF.
- The BFF throws → status `502` with `<ErrorPage title="Catalog unavailable" />`.

**Client entry** (`client.jsx`). `readEmbeddedCatalog(container)` parses the JSON in `#catalog-data`. `hydrate(container)` receives an element that contains the server HTML and calls `hydrateRoot` on its `#root` with `<App catalog={...} />`, returning the root. The server DOM nodes must be reused, hydration must log no mismatch, and afterwards **Add Keyboard to cart** updates `Cart items: 1` and typing in **Filter products** narrows the list.

**ADRs** (`decisions/adrs.js`). Export `adrs`, an array of four records in the shape of the *Architecture Decision Records* lesson plus a `layer`: `{ id, title, layer, status, context, decision, consequences, supersedes, supersededBy }`.

- One ADR per `layer`: `'rendering'`, `'organization'`, `'state'` and `'scale'`, with distinct `id`s.
- Every ADR has `status: 'accepted'`, `supersedes: null`, `supersededBy: null`, a non-empty `title`, and `context`, `decision` and `consequences` of at least 20 characters each.
- `consequences` names at least one cost, using one of these words: `cost`, `costs`, `slower`, `harder`, `risk`, `must`, `cannot`, `trade-off`, `downside`, `require(s)`, `lose`, `lost`, `higher`.

The ADRs must describe the code you ship (checked case-insensitively):

- **rendering**: `decision` mentions `SSR` (or "server-side render" / "server render") and hydration (`hydrat...`); `server/render.jsx` calls `renderToString(` and `client.jsx` calls `hydrateRoot(`.
- **organization**: `decision` mentions `feature` and `public API` (or `index`); no file deep-imports the catalog internals (see above).
- **state**: `decision` mentions `BFF` (or `view model`), `embed...`, and `local` (or `useState`); `ProductList.jsx` keeps its UI state with `useState(`, and no file imports a global store or client cache library (`zustand`, `jotai`, `redux`, `@reduxjs/toolkit`, `react-redux`, `mobx`, `valtio`, `@tanstack/react-query`).
- **scale**: `decision` rejects micro-frontends with a negation in the same sentence (`no`, `not`, `without`, `reject(s/ed)`, `instead of`, `rather than`, `avoid(s)` followed by `micro-frontends`), mentions `BFF` (one BFF, not one per client) and gives a reason with `because` or `since`.

Do not quote catalog internals as import paths in the ADR text.

**Trade-offs** (`decisions/tradeoffs.js`). Export `tradeoffs = { outOfScope, risks }`: two non-empty arrays of strings of at least 10 characters. `outOfScope` lists what was deliberately left out (and, ideally, the trigger to add it); `risks` lists what could hurt with the choices made.
