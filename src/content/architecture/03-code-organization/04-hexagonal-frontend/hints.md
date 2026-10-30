Work from the inside out: the domain first (it needs nothing), then the use case (it needs the domain and a port), then the adapters, and the composition root last.
---
The use case shrinks to three steps: `const order = createOrder(items);`, `const { id } = await orderGateway.save(order);`, `return { ...order, id };`. Import `createOrder` from `'../domain/order'`; the `fetch` call moves to the HTTP adapter unchanged except that it posts the whole `order` to `endpoint`.
---
The in-memory adapter closes over an array: `save` computes `orders.length + 1` as the id, pushes `{ ...order, id }` and returns `{ id }`. In `App.jsx`, `createPlaceOrder(createHttpOrderGateway('/api/orders'))` is the whole composition root.
