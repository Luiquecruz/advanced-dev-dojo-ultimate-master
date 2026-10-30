The product search screen keeps its filters in `useState`: a reload loses them, a link cannot be shared, the back button skips the whole screen. Make the URL the **source of truth** through a typed schema and one reusable hook.

Project layout (entry `App.jsx`):

```
App.jsx                                   MemoryRouter + route /products (done)
shared/url/createSearchSchema.js          createSearchSchema (TODO)
shared/url/useSearchState.js              useSearchState (TODO)
features/products/searchSchema.js         productSearchSchema (done)
features/products/ProductSearchPage.jsx   the screen (one TODO)
```

**`createSearchSchema(definition)`** returns `{ parse(searchParams), serialize(state) }`. A definition maps each key to a field:

| `type` | Extra options | `parse` result |
| --- | --- | --- |
| `'string'` | | the first value of the key |
| `'number'` | `min?`, `max?` | an integer (only digits, optional leading `-`) inside `min`/`max` |
| `'enum'` | `values` | the value when it is one of `values` |
| `'list'` | `values?` | every non-empty value of the key (`searchParams.getAll(key)`), restricted to `values` when given, **deduped and sorted** |

- `parse` returns an object with every key of the definition. A missing or invalid value becomes the field `default` (`page=0`, `page=abc`, `page=2.5`, `sort=random` all fall back).
- `serialize(state)` returns `URLSearchParams` in **canonical form**: keys in alphabetical order, keys whose value is `undefined` or equal to the default are omitted (a list equals its default when it has the same items), and a list writes one entry per item, sorted and deduped (`tags=a&tags=b`). With the definition `{ q, page, sort, tags }`, `serialize({ sort: 'price', q: 'mo', page: 1, tags: ['b', 'a'] }).toString()` is `'q=mo&sort=price&tags=a&tags=b'`.

**`useSearchState(schema)`** returns `[state, setState]`:

- `state` is `schema.parse(searchParams)` derived from `useSearchParams()` of `react-router`. No `useState` in this file: the URL is the only copy.
- `setState(partial, navigateOptions)` merges `partial` into the current state and writes `schema.serialize(nextState)` with `setSearchParams(..., navigateOptions)`.
- **Page reset rule**: when the state has a `page` key and `partial` does not contain `page`, the page goes back to its default (changing a filter starts at page 1). `setState({ page: 4 })` keeps every filter.

**`ProductSearchPage`** already uses the hook with `productSearchSchema` (`q`, `category` list of `hardware`/`software`, `sort` `name`/`price`, `page` from 1) and shows two products per page with `Page {n} of {total}`, `Previous page`/`Next page` buttons, `Hardware`/`Software` checkboxes, a `Sort by` select and a `<ul aria-label="Products">`. One change is left: typing in `Search` must use `{ replace: true }`, so a search term does not create one history entry per keystroke. Every other control pushes an entry.

The tests render the page in a memory data router and read `router.state.location.search` and `router.state.historyAction`.
