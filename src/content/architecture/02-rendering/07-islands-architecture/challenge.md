Build a tiny islands runtime. The sandbox plays both roles: `renderPage()` is the "server" that returns HTML, and `hydrateIslands()` is the client loader. `Counter`, `Disclosure`, `islandComponents`, `escapeAttribute` and `renderPage` are already written in `App.jsx`.

**Server: `renderIsland(name, props)`** (named export) returns the HTML string of one island:

- Render `islandComponents[name]` with `props` using `renderToString`.
- Wrap it in `<div data-island="<name>" data-props="<props as JSON>">…</div>`. Escape the JSON with `escapeAttribute` so quotes and `&` survive inside the attribute.

`renderPage()` uses it for three islands: `Counter` with `{ label: 'Likes', start: 3 }`, `Counter` with `{ label: 'Shares', start: 0 }` and `Disclosure` with `{ title: 'Shipping details', body: 'Ships in 2 days from Lisbon & Porto.' }`. Everything else on the page (`h1`, `p.description`, `p.specifications`, `footer`) is static HTML.

**Client: `hydrateIslands(root, components)`** (named export):

- Find every `[data-island]` element inside `root`.
- For each one, take the component named by `data-island` from `components`, parse `data-props` as JSON and call `hydrateRoot(islandElement, <Component {...props} />)`. Each island is its own root.
- Return the array of roots, in document order.
- If an island names a component that is not in `components`, **throw an `Error` whose message contains that name**, before hydrating any island.
- Never touch the static HTML: its nodes must stay the same and must not be re-rendered.

After hydration the counters increment on click (`Likes: 4`), the `Shipping details` button toggles `aria-expanded` and shows the body text, each counter keeps its own count, and hydration logs no mismatch errors.
