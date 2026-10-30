Build a server-rendered product catalog with Model-View-Controller. Each request runs `handleRequest(url)` and returns a complete HTML page, like Rails or Express with templates. `views/Layout.jsx` and `views/NotFoundView.jsx` are done.

**`models/product.js`** (model: the only file that talks to the API)

- `findProducts(query)` (done) fetches `/api/products?q=<query>` and returns the array.
- `findProductById(id)`: the API has no detail endpoint, so load every product through `findProducts('')` and return the one whose `id` equals `Number(id)`, or `null`.

**`views/ProductListView.jsx`**: `ProductListView({ products, query })`

- `<h1>Products</h1>`.
- A `<form method="get" action="/products">` with an `<input name="q">` labelled `aria-label="Search products"`, whose default value is `query`, and a `Search` submit button.
- A `<ul>` with one `<li>` per product: a link `<a href="/products/{id}">{name}</a>` followed by ` ${price}` (the item text reads `Keyboard $120`).
- When `products` is empty, render `<p>No products match "{query}".</p>` instead of the list.

**`views/ProductDetailView.jsx`**: `ProductDetailView({ product })` renders an `<article>` with `<h1>{name}</h1>`, `Price: ${price}`, `Category: {category}` and a link to `/products`.

**`controller.jsx`** (entry): `handleRequest(url)` is async and returns `{ status, html }`, where `html` is `<!DOCTYPE html>` plus the view rendered inside `Layout` with `renderToStaticMarkup` (the `renderPage` helper does this).

- `/products` (a trailing slash is fine): read `q` from the query string (default `''`), pass it to the model and to the view. Status `200`, title `Products`.
- `/products/:id` (digits only): status `200` with `ProductDetailView`, titled with the product name.
- Unknown product id or any other path: status `404` with `NotFoundView`, title `Not found`.

Rules checked by the tests: views receive data only (no `fetch`, `useEffect` or `useState` in the views or the controller); only the model calls `fetch`.
