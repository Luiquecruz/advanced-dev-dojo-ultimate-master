## Dynamic segments

Real apps have URLs like `/users/42` or `/posts/react-19/comments`. A segment starting with `:` is a **URL parameter**:

```jsx
<Route path="/users/:userId" element={<UserDetail />} />
```

Inside the matched element, `useParams()` returns the values:

```jsx
import { useParams } from 'react-router';

function UserDetail() {
  const { userId } = useParams();
  const user = users.find((entry) => entry.id === Number(userId));
  if (!user) return <p>User not found</p>;
  return <h2>{user.name}</h2>;
}
```

### Pitfall: params are always strings

`/users/42` gives `{ userId: '42' }`, never the number `42`. `entry.id === userId` silently fails when ids are numbers. Convert explicitly (`Number(userId)`) and handle invalid values: a URL is user input.

Other path features:

| Pattern | Matches |
| --- | --- |
| `/users/:userId` | `/users/7` |
| `/:lang?/about` | `/about` and `/en/about` (optional segment) |
| `/files/*` | anything below `/files`, read with `useParams()['*']` |

## Nested routes and `<Outlet>`

Pages often share a layout: a users page keeps the list on the left while the detail on the right changes. Nest `<Route>` elements and render an `<Outlet />` in the parent where the child should appear:

```jsx
<Routes>
  <Route path="users" element={<UsersLayout />}>
    <Route index element={<p>Select a user</p>} />
    <Route path=":userId" element={<UserDetail />} />
  </Route>
</Routes>
```

```jsx
import { Link, Outlet } from 'react-router';

function UsersLayout() {
  return (
    <section>
      <ul>
        {users.map((user) => (
          <li key={user.id}>
            <Link to={`/users/${user.id}`}>{user.name}</Link>
          </li>
        ))}
      </ul>
      <Outlet />
    </section>
  );
}
```

- Child paths are **relative** to the parent: `:userId` under `users` matches `/users/:userId`.
- An **index route** renders in the outlet when the parent path matches exactly (`/users`).
- The parent **stays mounted** while you move between children, so its state (scroll position, filters) is preserved.
- **Layout routes** have no `path`, only an `element`: they wrap children with shared UI without adding a URL segment.

```jsx
<Route element={<AppShell />}>
  <Route path="/" element={<Home />} />
  <Route path="settings" element={<Settings />} />
</Route>
```

`useOutletContext()` lets the parent pass data to whatever renders in its outlet: `<Outlet context={{ users }} />`.

## Relative links

Inside nested routes, `<Link to="3">` resolves relative to the current route, and `<Link to="..">` goes up one level. Absolute paths start with `/`.

## Old way

React Router v5 nested routes by rendering another `<Switch>` inside the child component and building paths by hand with `match.url`. Routes were scattered across components, and parent layouts could not see the whole tree. Since v6 the whole tree is declared in one place, and `<Outlet>` marks where children go.

## Reset state between params

Moving from `/users/1` to `/users/2` **reuses** the same `UserDetail` instance: only the param changes. Local state (form drafts, open tabs) carries over unless you reset it with a `key`: `<UserDetail key={userId} />`, or derive everything from the param.
