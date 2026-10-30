## From page reloads to one page

Server-rendered MVC reloaded the whole document on every click. Client-side MVC (Backbone, AngularJS) showed that the browser could keep the page alive and only swap the part that changes. The **single-page application (SPA)** takes that to its conclusion: the server sends one almost empty HTML shell and a JavaScript bundle, and everything else, from routing to rendering to data fetching, happens in the browser.

```html
<!DOCTYPE html>
<html>
  <head><script type="module" src="/assets/index.4b1c9e.js"></script></head>
  <body><div id="root"></div></body>
</html>
```

| Question | SPA / client-side rendering |
| --- | --- |
| Where is the HTML generated? | In the browser, by React |
| When? | After the bundle downloads, parses and runs |
| How much JS reaches the client? | All of it: framework, router, every page (unless code-split) |

The backend becomes a JSON API. Front end and back end deploy independently, and the shell is a static file a CDN can serve (lesson 01 rules apply: `index.html` with `no-cache`, fingerprinted bundles cached forever, and every unknown path falls back to `index.html` so the client router can handle it).

## How client routing works

A router library (React Router, TanStack Router) is three small ideas on top of the **History API**:

1. **The URL is the source of truth.** `window.location.pathname` decides which page renders.
2. **Navigating** calls `history.pushState(state, '', '/products')`: the address bar changes and a history entry is added, but the browser does **not** request a new document. `pushState` fires no event, so the router notifies its own subscribers.
3. **Back and forward** buttons fire `popstate` on `window` after the URL has changed. The router listens and re-renders.

```jsx
function subscribe(onChange) {
  window.addEventListener('popstate', onChange);
  return () => window.removeEventListener('popstate', onChange);
}

export function usePathname() {
  return useSyncExternalStore(subscribe, () => window.location.pathname);
}
```

`useSyncExternalStore` is the React API for reading a value that lives outside React. The snapshot must be a primitive or a cached object: returning a new `{ pathname }` object every call makes React think the store changed on every render.

Links stay real `<a href>` elements, so they work without JavaScript, show the target URL and can be opened in a new tab. The router intercepts only **plain left clicks** with `preventDefault()`; a Ctrl/Cmd click, Shift click or middle click is the user asking the browser for a new tab or window, and must not be hijacked.

## Data on the client

Pages fetch their own data after they mount:

```jsx
useEffect(() => {
  let ignore = false;
  fetch('/api/products').then((r) => r.json()).then((data) => { if (!ignore) setProducts(data); });
  return () => { ignore = true; };
}, []);
```

That creates the classic **request waterfall**: HTML → bundle → render → fetch → render again. A nested page that fetches its own data after its parent has finished doubles the chain. Libraries such as TanStack Query cache the results, and route loaders (React Router data mode) start fetching in parallel with the code for the route.

## What it solved and what it cost

Solved: instant navigation after the first load, state that survives page changes (a player, a cart, a half-filled form), app-like interactions, and a clean API boundary.

New costs:

- **Blank first screen.** Nothing is visible until the bundle runs, which is slow on weak phones and poor networks (bad First Contentful Paint and LCP).
- **SEO and link previews.** Crawlers and social scrapers that do not run JavaScript see an empty `<div id="root">`.
- **Bundle size.** Every page ships to every user unless you split code with `lazy()` and dynamic `import()`.
- **Waterfalls**, as above.
- **Rebuilt browser features.** Scroll restoration, focus management after navigation, and 404 statuses (the server answers `200` with the shell for every path) are now the app's job.

## When to choose it

Choose a SPA for applications behind a login where SEO does not matter and users stay a long time: dashboards, editors, internal tools, admin panels. The first load is paid once and every later interaction is fast. Use a router library rather than the hand-written one here; this lesson shows what it does. For public, content-heavy pages, prefer server rendering or static generation (the next lessons), possibly mixed per route with SPA navigation after the first load.
