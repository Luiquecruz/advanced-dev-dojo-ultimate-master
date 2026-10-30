1. Decide what the client needs to rebuild an island: the component name and its props. Both travel inside the HTML as `data-island` and `data-props`, so the props must be JSON.
2. In `renderIsland`, look up the component, render it with `renderToString` so the island is visible before JavaScript runs, and wrap the result in the marker element. Escape the JSON for the attribute; the browser decodes it again in `dataset`.
3. In `hydrateIslands`, collect the markers with `querySelectorAll('[data-island]')` and turn the `NodeList` into an array.
4. Validate before acting: if any marker names a missing component, throw an error that names it. Throwing halfway would leave the page half interactive.
5. Hydrate each marker element as its own root with `hydrateRoot`, passing the parsed props. Identical props produce identical HTML, so React adopts the server nodes instead of replacing them.
6. Return the roots so the caller can unmount them. Separate roots also mean separate state: clicking one counter cannot change another.
7. Notice what is missing: no component ever renders the `h1`, the descriptions or the footer on the client. That part of the page costs zero JavaScript.
