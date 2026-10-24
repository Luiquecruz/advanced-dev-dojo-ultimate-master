## One feature, four kinds of state

Real screens mix every kind of state at once. A product catalog with a cart is a good example, because each piece has a natural home:

| Piece | Kind | Home | Why |
| --- | --- | --- | --- |
| Products for the current search | server state | TanStack Query, key `['products', q]` | remote, cached per search, deduplicated |
| Submitted search term and category | URL state | `useSearchParams` | survives reload, shareable, back button works |
| What the user is typing before submitting | local (transient) state | `useState` in the search form | nobody else needs it |
| The cart | shared client state | a small Zustand store | client-owned, read by distant components, survives searches |
| Whether the cart list is expanded | local UI state | `useState` in the panel | belongs to one component |
| Visible products, count, total | derived values | computed in render or selectors | never stored |

The architecture work is mostly deciding these homes and the **boundaries** between them; the code then becomes short.

## Wiring the URL

```jsx
const [searchParams, setSearchParams] = useSearchParams();
const q = searchParams.get('q') ?? '';
const category = searchParams.get('category') ?? 'all';

function updateParam(name, value, emptyValue) {
  setSearchParams((params) => {
    if (value === emptyValue) params.delete(name);
    else params.set(name, value);
    return params;
  });
}
```

The functional updater keeps the other params intact, and deleting defaults keeps URLs clean (`/?q=mon` instead of `/?q=mon&category=all`).

## Server state keyed by URL state

```js
export const productsQueryOptions = (q) =>
  queryOptions({ queryKey: ['products', q], queryFn: () => fetchProducts(q), staleTime: 30_000 });
```

The URL drives the key; the cache drives the list. Going back to a previous search is instant because that key is still cached. The category is **not** part of the key here: the API does not filter by category, so filtering the cached array in render is cheaper than a new request. If the server filtered, the category would belong in the key.

## Local draft, URL on submit

```jsx
<SearchForm key={q} initialQuery={q} onSearch={(value) => updateParam('q', value, '')} />
```

The input is a local draft, so typing does not rewrite the URL or fire requests. `key={q}` resets the draft whenever the URL changes from elsewhere (back button, a link), which keeps both in sync without an effect.

## A client store that holds only client data

```js
export const useCartStore = create((set) => ({
  items: [],
  add: (product) => set((state) => ({ items: addOrIncrement(state.items, product) })),
  remove: (id) => set((state) => ({ items: state.items.filter((item) => item.id !== id) })),
}));

export const selectTotal = (state) => state.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
```

The cart copies only what the cart needs (`id`, `name`, `price`, `quantity`) at the moment of adding. It never mirrors the product list, so changing the search cannot affect it. Components subscribe through selectors.

## Testing an architecture

Good tests assert that each piece **lives in the right place**, through observable behavior:

- render with `MemoryRouter initialEntries={['/?q=o&category=software']}` to prove the URL is the source of truth;
- read `useLocation()` in a probe component to see URL writes;
- count API requests with `mockApi` to prove that filters on cached data do not refetch;
- inspect `queryClient.getQueryData(key)` and `useCartStore.getState()` to prove where data is stored;
- use a fresh `QueryClient` (with `retry: false`) and a fresh store per test.

## When to use it / when not to

Use this layered approach for any feature that combines remote data, shareable view state and user interaction: catalogs, dashboards, admin tables, search pages. Start each piece in its narrowest home and promote it only with a reason.

Do not force all four layers onto simple screens: a static page with one form needs neither a store nor URL state. And do not let layers leak: no fetched data in the store, no drafts in the URL, no UI flags in the cache.
