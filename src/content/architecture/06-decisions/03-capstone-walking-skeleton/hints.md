Start from the inside out: make `features/catalog/index.js` re-export `ProductList` (`export { ProductList } from './ProductList';`) and change the import in `App.jsx` to `'./features/catalog'`. The public API is the only door into the feature.
---
In the BFF, check `response.ok` before parsing, then `map` each product to `{ id, name, priceLabel: priceFormatter.format(product.price) }` and add `count: products.length`. The view model is the contract between server and UI: nothing more than the UI needs.
---
In `handleRequest`, parse the path with `new URL(url, 'http://localhost').pathname`, return the 404 page before calling the BFF, and wrap the BFF call in `try/catch` to return the 502 page. `serializeForScript` is `JSON.stringify(value).replace(/</g, '\\u003c')`: inside JSON strings `<` decodes back to `<`.
---
On the client, `JSON.parse(container.querySelector('#catalog-data').textContent)` gives the same view model the server rendered. Pass it to `hydrateRoot(container.querySelector('#root'), <App catalog={catalog} />)`: identical props on both sides mean no mismatch and the server nodes are adopted.
