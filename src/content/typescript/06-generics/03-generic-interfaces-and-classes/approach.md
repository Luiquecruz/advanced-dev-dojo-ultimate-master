1. Declare the generic `Page<T>` interface.
2. Add the type parameter with its `{ id: number }` constraint to the class and replace `unknown` with `T`.
3. Store items in a `Map` keyed by `id` so re-adding replaces them while keeping insertion order.
4. Implement `where` with `filter` and `paginate` with `slice`, computing the start index from a 1-based page.
