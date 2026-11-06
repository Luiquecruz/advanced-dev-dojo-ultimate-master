# Pagination and Sorting in Angular

A table that shows every row of a large table at once is slow for the server and unusable for the reader. Spring Data splits results into pages and sorts them on request, and an Angular screen drives both with two signals. This lesson covers the request parameters, the JSON a page comes back as, and a signal-driven table that keeps its page and sort order in step with the server.

You need: Calling the API with HttpClient and httpResource, Collections.

## What the client sends

Spring MVC turns three query parameters into a `Pageable` argument:

- `page`: the page you want, zero-based, 0 when missing.
- `size`: the page size, 20 when missing.
- `sort`: `property,direction`, for example `sort=name,desc`. Direction is `asc` or `desc`, and a repeated `sort` parameter sorts by several properties.

`GET /api/users?page=2&size=10&sort=name,desc` therefore asks for the third page of ten users, sorted by name from Z to A. Spring Boot properties such as `spring.data.web.pageable.default-page-size` and `max-page-size` change the defaults; the default maximum is 2,000.

## What the server returns

A repository method that takes a `Pageable` returns a `Page<T>`: the rows of one page plus the totals. Serializing the underlying `PageImpl` directly is discouraged by Spring Data, because its JSON can change when the class changes. Since Spring Data 3.3 a `PagedModel` gives a simplified, stable envelope:

```json
{
  "content": [{ "id": 11, "name": "User 11", "email": "user11@example.com" }],
  "page": { "size": 10, "number": 1, "totalElements": 25, "totalPages": 3 }
}
```

A controller wraps the page itself, and the Boot property `spring.data.web.pageable.serialization-mode` can switch every returned `Page` to the same shape.

```java
@GetMapping
PagedModel<User> list(Pageable pageable) {
    return new PagedModel<>(repository.findAll(pageable));
}
```

Module 05 covers repositories and paging queries. The envelope is a convention of Spring Data, not a formal standard, so the Angular side owns an interface for it:

```ts
export interface Page<T> {
  content: T[];
  page: { size: number; number: number; totalElements: number; totalPages: number };
}
```

## A table driven by signals

The state of the table is two signals, the zero-based page index and the sort. The request is a function of them, so `httpResource` sends a new request whenever either changes.

```ts
export interface SortState {
  property: 'name' | 'email';
  direction: 'asc' | 'desc';
}

export function toQueryParams(pageIndex: number, size: number, sort: SortState | null): Record<string, string | number> {
  const params: Record<string, string | number> = { page: pageIndex, size };
  if (sort) {
    params['sort'] = `${sort.property},${sort.direction}`;
  }
  return params;
}

protected readonly pageIndex = signal(0);
protected readonly sort = signal<SortState | null>(null);

protected readonly users = httpResource<Page<User>>(() => ({
  url: '/api/users',
  params: toQueryParams(this.pageIndex(), PAGE_SIZE, this.sort()),
}));
```

Everything else is derived. The **Previous** button is disabled while `pageIndex() === 0`. **Next** is disabled when `pageIndex() + 1` reaches `users.value().page.totalPages`, which comes from the server and not from a client-side guess. The label adds one, `Page {{ number + 1 }} of {{ totalPages }}`, because people count from one and Spring from zero.

Sorting is a click on a column header. The first click on a property sorts ascending, the next one descending, and any change returns to page 0: the old page number may not exist under the new order. Reading `value()` is safe only after `hasValue()` is true, since a loading or failed resource has no value.

## The server stays in charge

Spring copies the property names from `sort` as plain strings. An application must check them against the properties it is willing to sort by, and should cap `size`, because a client can ask for any page size up to the configured maximum.

```java
private static final Set<String> SORTABLE = Set.of("name", "email");
```

A rejected property is a 400 response, which the client reports like any Problem Details error.

## Common mistakes

- Sending `page=1` for the first page. Spring pages are zero-based, so the screen shows the second page of data under a label that says "Page 1".
- Keeping the old page index when the sort changes. The new order may have fewer pages, and the table can end up empty.
- Computing the last page on the client, for example from a hardcoded size. Use `totalPages` from the response, so the buttons follow the server.
- Letting the user type the `sort` value or the property name. Unchecked names reach the query and either fail or expose columns that were never meant to be sortable.

## In practice

Real screens keep the page, size and sort in the URL as query parameters, so a reload or a shared link shows the same view. They also debounce filters and keep the previous page visible while the next one loads. The contract stays the same: zero-based `page`, `size`, `property,direction` sort, and a response that carries its own totals.

## Check yourself

1. Which `page` value asks for the first page, and what does the screen show for it?
2. Why does changing the sort order reset the page index to 0?
3. What should the server do with a `sort` property that is not on its list of sortable properties?
