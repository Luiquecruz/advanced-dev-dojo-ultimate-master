Turn a store front into a **modular monolith**: one app, one build, three domain modules (`catalog`, `cart`, `account`) that the shell composes without knowing their internals. Today the app works, but the composition root reaches into module internals and the catalog imports the cart's store directly.

**Done for you**

- `shared/events.js`: `createEventBus()` returns `{ on(type, handler) → unsubscribe, emit(type, payload) }`.
- `shell/createShell.js`: `createShell()` returns `{ events, pages, addPage({ path, title, Component }) }`.
- `shell/Shell.jsx`: `<Shell shell={shell} />` renders `<nav aria-label="Modules">` with one button per page (the active one has `aria-current="page"`) and the current page as `<page.Component events={shell.events} />`. The first page is shown initially.
- `modules/account/index.js`: an example module. Its public API is `register(shell)`, which adds the `/account` page titled `Account`.
- `modules/cart/cartStore.js`: `createCartStore()` returns `{ subscribe, getLines, add(product) }`. `CartPage` (`<CartPage store={store} />`) shows `Items: {n}` (`data-testid="cart-count"`) and a `Cart lines` list (`Keyboard × 2`).

**Your tasks**

1. `modules/catalog/index.js`: `register(shell)` adds `{ path: '/catalog', title: 'Catalog', Component: CatalogPage }`.
2. `modules/catalog/CatalogPage.jsx`: the `Add {name}` buttons emit `'cart:add'` on the `events` prop with the product (`{ id, name, price }`). The catalog must not import anything from `modules/cart`.
3. `modules/cart/index.js`: `register(shell)` creates **its own** store with `createCartStore()` (one per call, never at import time), listens to `'cart:add'` on `shell.events` to add the product, and adds `{ path: '/cart', title: 'Cart', Component }` where the component renders `<CartPage store={store} />`. Remove the module-level `cartStore` singleton.
4. `App.jsx`: `createApp()` creates a shell, imports each module **through its public index** (`./modules/catalog`, not `./modules/catalog/CatalogPage`) and calls `register(shell)` in the order catalog, cart, account, then returns the shell. The default export renders `<Shell>` with it.

**Boundary rules the tests check**

- No file in `modules/<name>/` imports a file from another `modules/<other>/`.
- Files outside `modules/` import a module only as `modules/<name>` or `modules/<name>/index`.
