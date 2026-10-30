Finish a **walking skeleton** of a store: one feature, end to end, through every layer of the track. The sandbox runs the "server" and the "client" in the same page, so the server is a plain function.

```
App.jsx                         default App({ catalog }), ErrorPage({ title })   (done, fix the import)
features/catalog/index.js       public API of the catalog feature                (TODO)
features/catalog/ProductList.jsx, filterProducts.js                              (done, internal)
server/bff.js                   getCatalogViewModel()                            (TODO)
server/render.jsx               serializeForScript(value), handleRequest(url)    (TODO)
client.jsx                      readEmbeddedCatalog(container), hydrate(container) (TODO)
```

**Feature module.** `features/catalog/index.js` exports `ProductList`. No file outside `features/catalog/` may import a file inside it other than its `index`: `App.jsx` imports from `'./features/catalog'`.

**BFF** (`server/bff.js`). `getCatalogViewModel()` fetches `/api/products` and returns exactly `{ products: [{ id, name, priceLabel }], count }`, where `priceLabel` is the price formatted as US dollars (`$120.00`; use the provided `priceFormatter`). It throws when the response is not ok.

**Server entry** (`server/render.jsx`). `handleRequest(url)` returns `{ status, html }`, where `html` is a full document starting with `<!DOCTYPE html>`:

- `/` → status `200`, the app rendered with `renderToString(<App catalog={viewModel} />)` inside `<div id="root">`, followed by `<script id="catalog-data" type="application/json">` holding the view model.
- `serializeForScript(value)` produces that JSON with every `<` replaced by `<`, so a product named `</script>...` cannot close the tag. `JSON.parse` must still return the original data.
- Any other path → status `404` with `<ErrorPage title="Page not found" />`, **without** calling the BFF.
- The BFF throws → status `502` with `<ErrorPage title="Catalog unavailable" />`.

**Client entry** (`client.jsx`). `readEmbeddedCatalog(container)` parses the JSON in `#catalog-data`. `hydrate(container)` receives an element that contains the server HTML and calls `hydrateRoot` on its `#root` with `<App catalog={...} />`, returning the root. The server DOM nodes must be reused, hydration must log no mismatch, and afterwards **Add Keyboard to cart** updates `Cart items: 1` and typing in **Filter products** narrows the list.
