## The URL is a public API

Every screen that can be filtered, sorted, paged or tabbed has an implicit question: "what exactly am I looking at?". When the answer lives in the URL, the product gets four features for free: links can be **shared**, a **reload** restores the view, **back and forward** undo and redo navigation steps, and the **server** (SSR, a loader, a CDN, a crawler) can render the same view without running client code.

That makes the query string an **architecture contract**, not an implementation detail. Other teams link to `/products?category=hardware&sort=price`, marketing puts it in emails, support pastes it in tickets. Changing a parameter name is a breaking change, exactly like renaming a field of a REST API.

The React State Management track shows how to read and write params with `useSearchParams`. This lesson is about the design decisions around it.

## One schema per screen

Raw params are strings, possibly missing, duplicated or hand-edited. Reading them ad hoc (`Number(searchParams.get('page'))` in three components) spreads parsing rules and their bugs across the codebase. Give each screen **one schema** that owns its keys:

```js
export const productSearchSchema = createSearchSchema({
  q: { type: 'string', default: '' },
  category: { type: 'list', values: ['hardware', 'software'], default: [] },
  sort: { type: 'enum', values: ['name', 'price'], default: 'name' },
  page: { type: 'number', default: 1, min: 1 },
});
```

The schema does three jobs:

- **Defaults**: a missing key has a meaning, so components never deal with `null`.
- **Validation**: `page=0`, `page=abc` or `sort=random` fall back to the default instead of crashing the screen. Links outlive releases; an old link with a removed enum value must still open.
- **Coercion**: numbers become numbers, lists become arrays (`category=hardware&category=software`), enums are narrowed to known values.

Libraries give you the same idea with types: TanStack Router's `validateSearch` (often a Zod schema with `.catch()` per field), `nuqs` parsers (`parseAsInteger.withDefault(1)`), or a Zod object you call in a React Router loader. The point is that parsing happens **once, at the boundary**, and the rest of the screen receives a typed object.

## Canonical URLs

Two URLs that mean the same view should be the **same string**. `?sort=price&page=1` and `?sort=price` show identical results, but they are different keys for a CDN cache, a browser cache, a TanStack Query key built from the params and a search engine. Canonical serialization fixes that:

- **Omit defaults**: `page=1` and `q=` are noise.
- **Stable order**: sort keys (and list items when order has no meaning), so `?b=2&a=1` and `?a=1&b=2` never coexist.
- **One spelling per value**: repeated keys or comma-separated, pick one per team and document it.

Search engines also use `<link rel="canonical">` to merge duplicates; serializing canonically from the start means the canonical link is just the current URL.

## Never copy the URL into a store

The most common bug is a second source of truth: a Redux slice or `useState` initialized from the URL and synced back with effects. Now there are two copies, an effect order to get right, and a back button that updates one but not the other. Derive instead:

```js
const [searchParams, setSearchParams] = useSearchParams();
const search = useMemo(() => schema.parse(searchParams), [schema, searchParams]);
```

Writes go through the URL too (`setSearchParams(schema.serialize(next))`), and React re-renders from the new location. Server state follows the same rule: use the parsed search as the query key (`productQueries.list(search)`), so changing a filter changes the key and the cache does the rest.

## Push or replace, and other policies

Each write is either a **push** (a new history entry) or a **replace** (rewrite the current one):

- Push for discrete, deliberate choices the user may want to undo: a tab, a sort, a category, a page.
- Replace for continuous input (typing in a search box) and for corrections the user did not ask for (normalizing an invalid link to its canonical form).

Some rules cross every screen and belong in the shared hook, not in each component. The classic one: **a filter change resets pagination**. Without it, a user on page 7 narrows the filter to two pages of results and lands on an empty page.

## Pitfalls

- Putting large or private data in the URL (draft text, tokens): URLs end up in logs, analytics and referrer headers.
- Treating the URL as trusted: always parse, never `JSON.parse` a raw param.
- Debouncing writes without `replace`: the history fills with one entry per keystroke.
- Changing a param name without redirecting old links.

## When to choose it

Put state in the URL when it answers "what am I looking at?" and a user would expect it to survive a reload or a shared link: filters, search, sort, pagination, the active tab, the selected item. Keep it out when it is ephemeral (an open dropdown, a hover), private, or too large; use local state, form state or the server instead. Once you choose the URL, give each screen a schema, serialize canonically and keep no other copy.
