`toQueryParams` can start from an empty object and add `q` if it is not empty, `sort` if it is not `'name'` and `page` if it is not `1`.
---
`filters = toSignal(this.route.queryParamMap.pipe(map(parseFilters)), { initialValue: DEFAULT_FILTERS })`; `queryParamMap` has `get`, so it fits `parseFilters` directly.
---
In `update`, build `next = { ...this.filters(), ...changes }`; if `'q' in changes || 'sort' in changes`, set `next.page = 1` unless `changes.page` is given. Then `void this.router.navigate([], { queryParams: toQueryParams(next) })`.
