Build a paginated, sortable user table on top of the Spring `PagedModel` JSON shape. The project has one file, `app.ts`, with the types, the template and `appConfig` already written. The API answers `GET /api/users` with `{ content: User[], page: { size, number, totalElements, totalPages } }`, takes the query parameters `page` (zero-based), `size` and `sort` (`property,direction`), and returns 10 rows per page here (`PAGE_SIZE`).

1. `toQueryParams(pageIndex, size, sort)` returns `{ page, size }` and, only when `sort` is not `null`, a `sort` entry in the form `<property>,<direction>` such as `name,asc`.
2. `users` is an `httpResource<Page<User>>` for `/api/users` whose `params` come from `toQueryParams(this.pageIndex(), PAGE_SIZE, this.sort())`, so a change of page or sort sends a new request.
3. `hasPrevious` is `false` on the first page. `hasNext` is `true` only while the current page is not the last one reported by the server (`page.totalPages`) and `false` while there is no value.
4. `next()` and `previous()` move the page index by one.
5. `sortBy(property)`: the first click on a property sorts ascending, the next click on the same property descending, a click on another property starts ascending again. Every sort change returns to page 0.

The first request asks for page 0, while the screen reads `Page 1 of 3`: the template already adds one.
