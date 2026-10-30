1. Find the rules hidden in the use case (empty order, pricing, shipping) and move them into `createOrder`, a pure function you can test with plain values.
2. Name what the use case needs from the outside in its own language: "save this order and give me an id". That sentence is the port, `orderGateway.save(order)`.
3. Let the use case receive the port as a parameter of a factory, so it never chooses an implementation and never imports one.
4. Write the HTTP adapter: it is the only place that knows about URLs, JSON and status codes, and it translates a failed response into an error the UI can show.
5. Write the in-memory adapter with the same shape. If the use case works with both, the port is real.
6. Wire everything in the composition root: concrete adapter → use case → Context provider. The UI only knows `usePlaceOrder()`.
7. Check the dependency direction: domain imports nothing, application imports only the domain, adapters and UI sit at the edges, the root knows everyone.
