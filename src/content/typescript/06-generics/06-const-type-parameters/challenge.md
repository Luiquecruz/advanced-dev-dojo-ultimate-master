Callers of these helpers currently have to write `as const` to keep literal types. Add **`const` type
parameters** so the literals are preserved automatically.

1. `tuple(...items)` — returns its arguments as an array. `tuple(1, 'a', true)` must be typed
   `[1, 'a', true]` (a mutable tuple).
2. `oneOf(values)` — receives a list of strings and returns a type guard
   `(input: unknown) => input is <one of the values>`. `oneOf(['admin', 'editor'])` returns
   `(input: unknown) => input is 'admin' | 'editor'`.
3. `defineRoutes(routes)` — receives an object whose values are strings and returns it unchanged, typed
   with readonly literal properties:
   `defineRoutes({ home: '/', user: '/users/:id' })` is
   `{ readonly home: '/'; readonly user: '/users/:id' }`.
