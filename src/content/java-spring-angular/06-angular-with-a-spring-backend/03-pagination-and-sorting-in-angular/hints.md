`toQueryParams` builds a plain object: start with `{ page: pageIndex, size }` and add `params['sort'] = `${sort.property},${sort.direction}`` only inside an `if (sort)`.
---
The resource reads both signals inside its request function, so it refetches on its own: `httpResource<Page<User>>(() => ({ url: '/api/users', params: toQueryParams(this.pageIndex(), PAGE_SIZE, this.sort()) }))`.
---
`hasNext` is a `computed`. Return `false` while `this.users.hasValue()` is `false`; otherwise compare `this.pageIndex() + 1` with `this.users.value().page.totalPages`.
---
In `sortBy`, read the current sort, pick `'desc'` only when the same property is already sorted ascending, set the new `SortState`, then `this.pageIndex.set(0)`.
