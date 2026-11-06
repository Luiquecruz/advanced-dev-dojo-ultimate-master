1. Implement `getById` with `this.http.get<Product>(...)`. The generic only describes the JSON you expect; the server decides what arrives.
2. Create `products` with `httpResource<Product[]>`. Return an object with `url` and `params` from the request function and read `this.query()` inside it, so the resource tracks the signal and cancels the previous request when it changes.
3. Add `{ defaultValue: [] }` so the template can loop over `value()` without handling `undefined`.
4. Extend the template as a chain of states: loading, error, data. Order matters because `value()` throws while the resource is in the error state; the error branch shows a message and a button bound to `products.reload()`.
5. Run the tests: the failing request test replaces the fake route with a 503 once, then lets the second call succeed, which proves that `reload()` sends a new request.
