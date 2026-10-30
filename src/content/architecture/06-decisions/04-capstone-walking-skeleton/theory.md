## The final project, step by step

Every module of the track answered one layer. The capstone puts them together the way a real project starts:

1. **Brief**: write the product as facts. Here: a public store catalog that must be indexed, prices that must be current, one team, one web client, simple rules.
2. **Decide per layer**: apply the simplest option that satisfies the facts (the previous lesson's rules).
3. **Record**: one ADR per layer, with context, decision and the costs you accept.
4. **Build a walking skeleton**: one feature, end to end, through every decision.
5. **Present the trade-offs**: what you left out on purpose and what could hurt.

| Layer | Decision |
| --- | --- |
| Rendering | SSR per request, hydrated on the client |
| Code organization | feature folder `features/catalog` behind its `index.js` |
| State and data | BFF view model embedded as JSON; UI state (filter, cart) local |
| Scale | one app, one deploy, one BFF; no micro-frontends, no BFF per client |

## Decisions that are checked

An ADR that disagrees with the code is worse than no ADR. Keep the records in the repository (`decisions/adrs.js` here) and test that they still describe the code: the rendering ADR says SSR with hydration and the server really calls `renderToString` while the client calls `hydrateRoot`; the organization ADR promises public APIs and an import scan proves no file reaches into `features/catalog/` internals; the state ADR says "no global store" and no file imports one. Every ADR names at least one cost, because a decision without a cost is a sales pitch.

## What a walking skeleton is

Alistair Cockburn described a **walking skeleton** as "a tiny implementation of the system that performs a small end-to-end function". It does almost nothing, but it does it through **every** layer: the request reaches the server, the server talks to the backend, HTML is rendered, the client hydrates, and a user can click something. It proves the decisions **work together**, surfaces integration problems (serialization, hydration, status codes) while they are cheap, and gives every later feature a shape to copy. It is not a throwaway prototype: it is production code with very little flesh.

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

1. **Routing decides the status before doing work.** An unknown path is a 404 and never touches the backend. A backend failure is a **502**, not a 404 or a blank 200.
2. **The BFF shapes the data.** `/api/products` returns `price` and `category`; the page needs `id`, `name` and a formatted `priceLabel`.
3. **The server renders HTML**, so crawlers and users see products immediately.
4. **The view model travels with the HTML** in `<script type="application/json">`, so the client does not fetch it again.
5. **The client hydrates** with the same component and the same data, so React adopts the existing nodes.

## Embedding data safely

The HTML parser reads a `<script>` until it sees `</script>`, **before** any JSON parsing. A product named `</script><script>alert(1)</script>` would close the tag early and run the attacker's script.

```jsx
export function serializeForScript(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}
```

`<` is a valid JSON escape for `<`: `JSON.parse` returns the original string, but the HTML parser never sees a `<`.

## Trade-offs and what was left out

No router library, no TanStack Query, no global store, no streaming, no micro-frontends. Each one solves a problem the skeleton does not have yet. Listing them with the trigger that would justify each one ("TanStack Query with the first client-side mutation") tells the next person it was a choice, not an oversight. Next to them, list the risks you accept: SSR costs a render per request, the products service is a single point of failure, the cart is lost on reload.

## Pitfalls

- Building layers in isolation and integrating at the end.
- ADRs written once and never checked against the code.
- Different props on server and client, which causes hydration mismatches.
- Swallowing backend failures into an empty 200 page.
- Deep imports "just this once", which quietly erase the boundary.

## When to choose it

Start every new product, and every new architectural layer in an existing product, this way: facts, one decision per layer, an ADR for each, a walking skeleton through all of them, and an explicit list of trade-offs. Choose the thinnest feature that crosses all layers, make it run end to end with tests, and only then add width. Skip it only for throwaway prototypes whose architecture will not survive.
