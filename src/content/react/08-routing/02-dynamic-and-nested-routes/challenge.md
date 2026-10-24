Build a users section with a dynamic, nested route. The starter exports `users`, an array of `{ id, name, role }` with **numeric** ids (1 Ada Lovelace, 2 Alan Turing, 3 Grace Hopper).

Export `AppRoutes` (the tests render it inside a `MemoryRouter`) with these routes:

- `/` → `<h1>Welcome</h1>`
- `/users` → `UsersLayout`, with nested routes:
  - **index** → `<p>Select a user</p>`
  - `:userId` → `UserDetail`

`UsersLayout` renders `<h1>Users</h1>`, a `<ul>` with one `<li>` per user containing a `<Link>` to `/users/{id}` with the user's name, and an `<Outlet />` below the list.

`UserDetail` reads `userId` with `useParams()`, finds the user (convert the param to a number) and renders `<h2>{name}</h2>` and `<p>Role: {role}</p>`. When no user matches, it renders `<p>User not found</p>`.
