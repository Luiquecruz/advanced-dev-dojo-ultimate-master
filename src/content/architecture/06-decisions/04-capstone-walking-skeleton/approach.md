1. Draw the request path before coding: URL → `handleRequest` → BFF → `/api/products` → view model → `renderToString` → HTML with embedded JSON → `hydrate` → interactive UI. Each file owns one step.
2. Fix the boundary first. Export `ProductList` from the feature's `index.js` and import it from there in `App.jsx`; `filterProducts` stays internal, so the feature can change it freely.
3. Shape the data in the BFF. Validate the upstream status, then map to the smallest view model the UI needs. Formatting the price on the server keeps the UI free of currency rules and makes the payload smaller.
4. Route in the server entry. Decide the status before doing work: unknown paths return 404 immediately, a BFF failure becomes 502 (a gateway problem, not a missing page), and only `/` renders the app.
5. Serialize safely. Data placed inside `<script>` is parsed as HTML first, so any `</script>` in the data would end the tag. Escaping `<` as `<` keeps the JSON valid and inert.
6. Hydrate with the same input. Read the embedded JSON, pass it to the same `App`, and call `hydrateRoot` on `#root`. Same component and same props produce the same first render, so React adopts the existing nodes and attaches events.
7. Run the tests and read them as the skeleton's acceptance criteria: every layer is exercised once, end to end, before any second feature is added.
