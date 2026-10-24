1. Mount the API correctly: reducer under `reducerPath` and the middleware, which is what processes invalidation and cache lifetimes.
2. Declare the tag vocabulary with `tagTypes`.
3. Describe what each query contains: the list provides a `LIST` tag for the collection and one id tag per item; the detail provides its own id tag.
4. Describe what each mutation changes: creating changes the collection (`LIST`), updating changes one item (its id tag).
5. Check granularity: updating todo 2 matches the list (it provides `Todo:2`) and `getTodo(2)`, but nothing provides `Todo:2` for todo 3, so its query stays cached.
