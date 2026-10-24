Nest the child routes inside the parent: `<Route path="users" element={<UsersLayout />}> ... </Route>`. Children need an `<Outlet />` in `UsersLayout` to appear.
---
Use `<Route index element={<p>Select a user</p>} />` for `/users` and `<Route path=":userId" element={<UserDetail />} />` for the detail.
---
In `UserDetail`: `const { userId } = useParams();` then `users.find((entry) => entry.id === Number(userId))`. Params are strings, so compare after converting.
