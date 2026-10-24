Start with `parseFilters`: read each param with `searchParams.get(key)`, and use `CATEGORIES.includes(value) ? value : DEFAULTS.category` to reject unknown values.
---
In the component: `const [searchParams, setSearchParams] = useSearchParams();` and `const { q, category, sort } = parseFilters(searchParams);`. Delete the three `useState` calls.
---
`setSearchParams((previous) => { const next = new URLSearchParams(previous); ...; return next; }, options)`. Inside, `next.delete(key)` when `value === DEFAULTS[key]`, otherwise `next.set(key, value)`.
---
Pass `{ replace: true }` only from the search input. `Clear filters` can call `setSearchParams({})`.
