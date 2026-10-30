1. Define the contract first: a module exposes exactly one public function, `register(shell)`, and the shell exposes only `addPage` and an event bus. Nothing else crosses a module boundary.
2. Implement the catalog's `register` following the account example, so the shell learns about the page without importing `CatalogPage` itself.
3. Replace the direct call into the cart store with an event. The catalog announces a fact (`cart:add` with the product) and no longer depends on who reacts to it.
4. Move the cart state into `register`: create the store there, subscribe it to the bus, and close over it in the page component. State created per registration keeps app instances (and tests) independent; a module-level singleton would leak between them.
5. Rewrite the composition root to import each module through its folder index and register them in order. The root is now the only place that knows which modules exist.
6. Check the boundaries the way CI would: scan every import, resolve it relative to its file, and fail when it lands inside another module or bypasses an index.
