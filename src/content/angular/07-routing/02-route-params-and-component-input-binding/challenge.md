Build a user directory where the URL drives the detail page. `USERS`, the `UserDetail` template and the `App` shell are already written.

1. `UserList` renders one `<li>` per user with a link to `/users/<id>` whose text is the user name (use `[routerLink]` with a commands array).
2. `UserDetail` receives two values through **component input binding** (replace the placeholder signals):
   - `id = input.required(...)` for the `:id` route param, converted to a number with `numberAttribute`;
   - `tab = input<string>()` for the `?tab=` query param. The template already falls back to `'profile'` when it is `undefined`.
3. Export `routes: Routes`:
   - `''` redirects to `'users'` (`pathMatch: 'full'`)
   - `'users'` → `UserList`
   - `'users/:id'` → `UserDetail`
4. `appConfig` provides the router with `withComponentInputBinding()`.

The "Next user" link keeps the same `UserDetail` instance alive and only changes the param. Your inputs must react to that.
