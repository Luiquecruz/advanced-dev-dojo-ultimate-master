Untangle a checkout into a hexagon. Today `application/placeOrder.js` prices the order and calls `fetch` itself. Move the rules to the domain, talk to the outside world through a port, write two adapters and wire them in a composition root. `ui/PlaceOrderContext.jsx` and `ui/Checkout.jsx` are done.

Items look like `{ productId, name, price, quantity }`.

**`domain/order.js`**: pure rules, no React, no `fetch`

- `createOrder(items)` returns `{ items, subtotal, shipping, total }`.
- Throws `'An order needs at least one item'` for an empty list and `'Quantities must be positive integers'` when a quantity is not an integer of at least 1.
- `shipping` is `0` when `subtotal >= FREE_SHIPPING_THRESHOLD` (100), otherwise `SHIPPING_FEE` (10). `total = subtotal + shipping`.

**`application/placeOrder.js`**: the use case

- `createPlaceOrder(orderGateway)` returns `async placeOrder(items)`: it builds the order with `createOrder`, saves it with the port `orderGateway.save(order)` (resolves to `{ id }`) and returns `{ ...order, id }`.
- It imports the domain, never React, never an adapter, and never calls `fetch`.

**Adapters** (implementations of the `orderGateway` port)

- `adapters/httpOrderGateway.js`: `createHttpOrderGateway(endpoint)` → `{ save(order) }` that POSTs the order as JSON to `endpoint`, throws `Order failed: {status}` when the response is not ok, and resolves to `{ id }` from the response body.
- `adapters/inMemoryOrderGateway.js`: `createInMemoryOrderGateway()` → `{ save(order), list() }`. `save` stores the order with ids `1`, `2`, `3`... and resolves to `{ id }`; `list()` returns the saved orders, each including its `id`.

**`App.jsx`**: the composition root

- Create the HTTP adapter with `createHttpOrderGateway('/api/todos')` (the fake API has no orders endpoint; `POST /api/todos` stores any JSON and returns a new id), pass it to `createPlaceOrder`, and provide the use case with `<PlaceOrderProvider placeOrder={...}>`.

The checkout shows `Order #{id} placed: {total}` (`role="status"`) on success and the error message (`role="alert"`) on failure.
