## The URL is a state container

The address bar is the oldest state store on the web, and the only one users can **copy, bookmark, share and navigate with back/forward**. Anything that answers "what am I looking at?" belongs there: filters, search terms, sort order, the selected tab, the current page, the id of an open item.

If that state lives in `useState`, users lose it on reload, cannot send the view to a colleague, and the back button jumps out of the page instead of undoing the last filter.

## Reading: the URL is the source of truth

With React Router, `useSearchParams` returns the current `URLSearchParams` and a setter. Do **not** copy the params into `useState`; derive everything during render:

```jsx
const [searchParams, setSearchParams] = useSearchParams();
const category = searchParams.get('category') ?? 'all';
```

Anyone can type anything in a URL, so treat params as **untrusted input**. Parse them in one place, validate against known values and fall back to defaults:

```js
const SORTS = ['name', 'price-asc', 'price-desc'];

export function parseFilters(searchParams) {
  const sort = searchParams.get('sort');
  return { sort: SORTS.includes(sort) ? sort : 'name' };
}
```

For larger schemas, a Zod schema with `.catch(defaultValue)` per field does the same job declaratively.

## Writing: functional updates and clean URLs

`setSearchParams(next)` **replaces all params**. Updating one key with `setSearchParams({ sort: 'price-asc' })` silently drops `category` and `q`. Use the functional form, which receives the current params:

```jsx
function updateFilter(key, value, options) {
  setSearchParams((previous) => {
    const next = new URLSearchParams(previous);
    if (value === DEFAULTS[key]) next.delete(key);
    else next.set(key, value);
    return next;
  }, options);
}
```

Deleting default values keeps URLs short and canonical: `/products` and `/products?category=all` should not be two different links to the same view.

## Push or replace?

Each update creates a history entry by default (**push**). That is right for discrete choices (category, sort, page): back undoes them one at a time. For continuous input such as typing, pushing one entry per keystroke makes the back button useless. Pass `{ replace: true }` to overwrite the current entry instead.

| Interaction | History |
| --- | --- |
| Pick a category, sort, page | push |
| Type in a search box | replace (optionally debounce) |
| Normalize an invalid URL | replace |

## Practical concerns

- **Types**: params are strings. Convert numbers (`Number(searchParams.get('page') ?? 1)`) and validate them.
- **Reset dependent params**: when the category changes, delete `page` in the same update so users do not land on page 7 of a shorter list.
- **Server data**: put the parsed params into your query keys (`['products', filters]`), so the server cache follows the URL automatically.
- **Path vs search**: identity of a resource goes in the path (`/orders/42`); optional view modifiers go in the search string.
- **Outside React Router**: frameworks expose the same idea (`useSearchParams` in Next.js, `nuqs` for typed params); the principles do not change.

## When to use it / when not to

Use the URL for state that defines **what is on screen** and should survive reloads, be shareable or respond to back/forward: filters, sorting, pagination, search, tabs, selected entities, open modals that deserve a link. Do not put secrets, large objects, transient UI (hover, an open dropdown), high-frequency values (slider dragging, scroll position) or unsaved form drafts in the URL. When a value must also be global, still keep the URL as the single source and read it where needed instead of mirroring it into a store.
