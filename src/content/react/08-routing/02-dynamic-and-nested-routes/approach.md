1. Declare `/users` as a parent route rendering `UsersLayout`, with an index child and a `:userId` child.
2. In the layout, render a `Link` per user and an `<Outlet />` where the child route goes.
3. In `UserDetail`, read the param with `useParams`, convert it to a number and look up the user.
4. Render the name and role, or the not-found message when the lookup fails.
