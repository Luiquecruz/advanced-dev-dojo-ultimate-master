## What a walking skeleton is

Alistair Cockburn described a **walking skeleton** as "a tiny implementation of the system that performs a small end-to-end function". It does almost nothing, but it does it through **every** architectural layer: the request reaches the server, the server talks to the backend, HTML is rendered, the client hydrates, and a user can click something.

Why build it first?

- It proves the architecture decisions **work together** before features pile up on top of them.
- It surfaces integration problems (serialization, hydration, routing, status codes) while they are cheap to fix.
- It gives every later feature a path to follow: copy the shape, not invent a new one.

The skeleton is not a prototype to throw away. It is production code with very little flesh, and it grows.

## The architecture of this capstone

The briefing: a public store catalog that must be indexable (server-rendered HTML), a backend made of services whose payloads are bigger than the UI needs (a BFF), and a codebase that several people will grow (feature modules with public APIs). The decisions per layer:

| Layer | Decision |
| --- | --- |
| Rendering | SSR per request, hydrated on the client |
| Code organization | feature module `features/catalog` behind `index.js` |
| State and data | BFF view model embedded as JSON; local UI state (filter, cart count) in the component |
| Scale | one app, one deploy (a modular monolith in miniature) |

## The request path

```jsx
export async function handleRequest(url) {
  const { pathname } = new URL(url, 'http://localhost');
  if (pathname !== '/') return renderErrorPage(404, 'Page not found');
  const catalog = await getCatalogViewModel();
  const appHtml = renderToString(<App catalog={catalog} />);
  return { status: 200, html: renderDocument(appHtml, serializeForScript(catalog)) };
}
```

1. **Routing decides the status before doing work.** An unknown path is a 404 and never touches the backend. A backend failure is a **502** (the gateway could not get a valid answer upstream), not a 404 or a blank 200.
2. **The BFF shapes the data.** `/api/products` returns `price` and `category`; the page only needs `id`, `name` and a formatted `priceLabel`. Shaping on the server keeps currency rules out of the UI and the payload small.
3. **The server renders HTML** with `renderToString`, so crawlers and users see products immediately.
4. **The view model travels with the HTML** inside `<script type="application/json">`, so the client does not fetch it again.
5. **The client hydrates** with the same component and the same data, so React adopts the existing nodes instead of rebuilding them.

## Embedding data safely

The browser's HTML parser reads a `<script>` element until it sees `</script>`, **before** any JSON parsing happens. If a product is named `</script><script>alert(1)</script>`, a naive `JSON.stringify` closes the tag early and runs the attacker's script.

```jsx
export function serializeForScript(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}
```

`<` is a valid JSON escape for `<`: `JSON.parse` returns the original string, but the HTML parser never sees a `<`. Frameworks (Next.js, React Router, TanStack Query's `dehydrate` helpers) do the same; when you embed data yourself, it is your job.

## Boundaries that hold

`App.jsx` imports `ProductList` from `'./features/catalog'`, never from `'./features/catalog/ProductList'`. The feature can rename, split or rewrite its internals (`filterProducts`, extra hooks) without breaking callers. A test that scans imports turns this convention into a rule, the same way `src/architecture.test.ts` guards this very repository.

## What was left out on purpose

No router library, no TanStack Query, no global store, no streaming, no micro-frontends. Each one solves a problem the skeleton does not have yet. Record that in the ADRs ("we will add TanStack Query when the first client-side mutation appears") so the next person knows it was a choice, not an oversight.

## Pitfalls

- Building layers in isolation (a full design system, then a BFF, then rendering) and integrating at the end.
- Different props on server and client, which causes hydration mismatches.
- Swallowing backend failures into an empty 200 page.
- Deep imports "just this once", which quietly erase the boundary.

## When to choose it

Start every new product, and every new architectural layer in an existing product, with a walking skeleton. Choose the thinnest feature that crosses all layers, make it run end to end with tests, record the decisions as ADRs, and only then add width. Skip it only for throwaway prototypes whose architecture will not survive.
