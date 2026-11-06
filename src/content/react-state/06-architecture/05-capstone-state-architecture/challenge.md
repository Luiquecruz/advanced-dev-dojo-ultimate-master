**Capstone.** Finish a product catalog with a cart where every piece of state lives in its proper home: server state in **TanStack Query**, view state in the **URL**, the cart in a **Zustand store**, and drafts and toggles in **local state**. `App.jsx` (providers) and `CartPanel.jsx` are done.

**`api.js`** (server state)

- `productKeys.search(q)` returns `['products', q]`. `productsQueryOptions(q)` (done) uses it, so every search has its own cache entry.

**`cartStore.js`** (client store)

- `useCartStore` holds only `items` (`{ id, name, price, quantity }`), `add(product)` and `remove(id)`.
- `add` appends a line with `quantity: 1`, or increments the existing line; `remove` deletes it. Both update immutably.
- `selectCount(state)`: sum of quantities. `selectTotal(state)`: sum of `price * quantity`.

**`Catalog.jsx`** (URL + local state)

- Read `q` (default `''`) and `category` (default `'all'`) from `useSearchParams`.
- The `Search products` input is a **local draft**: typing changes neither the URL nor the query. Submitting (`Search` button) writes `q` to the URL (`?q=mon`); an empty value removes the param.
- The `All` / `Hardware` / `Software` buttons write `category` to the URL (removed for `'all'`), keep `q`, and mark the active one with `aria-pressed`.
- The list (`<ul aria-label="Products">`) shows the cached products for `q`, filtered by `category` **in render**, with no extra request. Each product has an `Add {name}` button calling the store's `add`.

**`CartPanel.jsx`** (done): `Items: {n}` (`data-testid="cart-count"`), `Total: ${total}` (`data-testid="cart-total"`), and a local `Show items` / `Hide items` toggle listing `Remove {name}` buttons.

Tests render `Shop` inside their own `QueryClientProvider` and `MemoryRouter`, check the URL with `useLocation`, count `/api/products` requests and inspect the query cache and the store.
