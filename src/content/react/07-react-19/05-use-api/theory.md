## `use`: read a resource during render

`use` is a React 19 API that reads the value of a **resource** while rendering. Today a resource is either a **Promise** or a **Context**.

```jsx
import { use } from 'react';

function Comments({ commentsPromise }) {
  const comments = use(commentsPromise);
  return comments.map((comment) => <p key={comment.id}>{comment.body}</p>);
}
```

When the Promise is still pending, `use` **suspends** the component: React shows the nearest `<Suspense>` fallback and retries when the Promise settles. If it rejects, the nearest **Error Boundary** renders.

```jsx
<Suspense fallback={<p>Loading comments...</p>}>
  <Comments commentsPromise={commentsPromise} />
</Suspense>
```

## `use` is not a Hook

Hooks must be called at the top level. `use` is the exception: it can be called **inside conditions, loops and after early returns**, as long as it runs during render (not in event handlers or effects).

```jsx
function Heading({ children, hidden }) {
  if (hidden) {
    return null;
  }
  const theme = use(ThemeContext);
  return <h1 className={theme}>{children}</h1>;
}
```

`useContext(ThemeContext)` could not be placed after that `return`. With `use` the component only subscribes when it actually needs the value.

## Old way vs new way for data

```jsx
// Before: effect + three states, waterfalls after the first render
function User({ id }) {
  const [user, setUser] = useState(null);
  useEffect(() => {
    fetch(`/api/users/${id}`).then((response) => response.json()).then(setUser);
  }, [id]);
  if (!user) return <p>Loading...</p>;
  return <h2>{user.name}</h2>;
}
```

```jsx
// After: the parent starts the request, the child just reads it
function User({ userPromise }) {
  const user = use(userPromise);
  return <h2>{user.name}</h2>;
}
```

Loading UI moves to `<Suspense>` boundaries, so several components can share one spinner and data can start loading **before** the component renders (in a route loader, an event handler or a Server Component).

## The biggest pitfall: creating the Promise during render

```jsx
function User({ id }) {
  // ❌ A new Promise on every render: suspends forever
  const user = use(fetch(`/api/users/${id}`).then((response) => response.json()));
}
```

Every render creates a new, pending Promise, so React suspends again and again. React warns: *"A component was suspended by an uncached promise"*. The Promise must be **stable**:

- created by a parent and passed as a prop (stored in state, or created in an event handler),
- returned by a cache (`cache()` in Server Components, TanStack Query, a router loader),
- or created in a Server Component and passed to a Client Component.

## `use(browser())` — React 19.3

React 19.3 added `browser()` to `react-dom`. It returns a resource that suspends on the server and resolves immediately in the browser, so a component that depends on `localStorage`, the time zone or `window` can opt out of SSR while staying inside Suspense:

```jsx
import { use } from 'react';
import { browser } from 'react-dom';

function TimeZone() {
  use(browser());
  return <p>{Intl.DateTimeFormat().resolvedOptions().timeZone}</p>;
}
```

The server sends the nearest Suspense fallback; the client fills it in after hydration. Like any `use` call, it can be conditional.

## When to use what

| Need | Use |
| --- | --- |
| Context, unconditionally | `useContext` or `use` |
| Context after an early return or in a branch | `use` |
| Promise created outside render | `use` + `<Suspense>` + Error Boundary |
| Fetching with caching, refetching, mutations | a data library (it may use `use` internally) |
