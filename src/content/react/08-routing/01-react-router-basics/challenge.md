Build the routes and navigation of a tiny site with React Router.

Export `AppRoutes` (rendered inside a router by the tests) that renders:

1. A `<nav>` with two `NavLink`s: `Home` to `/` (with `end`) and `About` to `/about`.
2. A `<Routes>` block with:
   - `/` → `<h1>Home</h1>`
   - `/about` → `<h1>About</h1>`
   - any other path → `NotFound`, which renders `<h1>Page not found</h1>` and a `<button>` with the text `Go home` that navigates to `/` with `useNavigate`.

The default export `App` wraps `AppRoutes` in a `MemoryRouter` (already done in the starter).

Do not use plain `<a>` tags.
