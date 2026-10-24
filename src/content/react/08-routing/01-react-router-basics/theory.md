## Why a router?

A single-page app swaps components instead of loading new HTML documents. A router keeps the **URL** and the **UI** in sync: the URL decides which components render, links change the URL without a full reload, and the back button keeps working.

**React Router** is the most used router. Version 7 merged Remix into it and ships everything from a single package, `react-router` (`react-router-dom` now only re-exports it). It can be used in three modes:

| Mode | You get | Entry point |
| --- | --- | --- |
| Declarative | `<Routes>`, `<Link>`, hooks | `<BrowserRouter>` |
| Data | + loaders, actions, pending UI | `createBrowserRouter` + `<RouterProvider>` |
| Framework | + file routing, SSR, code splitting, type safety | Vite plugin `@react-router/dev` |

This lesson covers the declarative mode.

## Routes

```jsx
import { BrowserRouter, Routes, Route } from 'react-router';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
```

- `<BrowserRouter>` uses the History API (`/about`). `<MemoryRouter>` keeps the location in memory, which is what tests and this sandbox use.
- `<Routes>` picks the **best match**, not the first one, so order does not matter.
- `path="*"` matches anything else: your 404 page.

## Links

```jsx
import { Link, NavLink } from 'react-router';

<nav>
  <NavLink to="/" end>Home</NavLink>
  <NavLink to="/about">About</NavLink>
  <Link to="/contact">Contact</Link>
</nav>
```

`<Link>` renders an `<a>` but intercepts the click: it updates the URL with `history.pushState` and re-renders, with no document reload, so state survives.

`<NavLink>` knows if it is active. It adds `aria-current="page"` and an `active` class, and accepts functions: `className={({ isActive }) => (isActive ? 'current' : '')}`. Add `end` to `/` so Home is not considered active on every page (every path starts with `/`).

### Pitfall: plain anchors

```jsx
<a href="/about">About</a>   // ❌ full page reload, all state lost
<Link to="/about">About</Link> // ✅ client-side navigation
```

## Navigating from code

```jsx
import { useNavigate } from 'react-router';

function NotFound() {
  const navigate = useNavigate();
  return <button onClick={() => navigate('/')}>Go home</button>;
}
```

`navigate(-1)` goes back; `navigate('/login', { replace: true })` replaces the current history entry (useful after a redirect, so Back does not return to it). For redirects during render, use `<Navigate to="/login" replace />`.

## Reading the location

`useLocation()` returns `{ pathname, search, hash, state }`. `useSearchParams()` reads and writes the query string like `useState`:

```jsx
const [searchParams, setSearchParams] = useSearchParams();
const query = searchParams.get('q') ?? '';
```

## Old way

React Router v5 used `<Switch>` (first match wins), `component={About}` props, `exact` flags and `useHistory().push()`. v6 replaced them with `<Routes>`, `element={<About />}`, ranked matching and `useNavigate`. v7 keeps the v6 API, adds data and framework features, and moves everything into `react-router`.
