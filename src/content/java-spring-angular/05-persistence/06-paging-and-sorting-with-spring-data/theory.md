# Paging and Sorting with Spring Data

A table that holds 20 rows today will hold 2 million later, and a method that returns `List<Course>` will one day return all of them. Pagination limits every list to a window, and sorting decides which rows fall into which window. This lesson covers `Pageable`, the difference between `Page` and `Slice`, why a sort must be stable, how request parameters become a `Pageable`, keyset pagination for deep lists and a response shape that clients can rely on.

You need: JPA and Hibernate Basics, Spring Data Repositories, The N+1 Problem and Fetching.

## Pageable, Page and Slice

A `Pageable` holds a zero-based page number, a page size and a `Sort`. Pass it as the last argument of a repository method:

```java
Page<CourseSummary> findSummariesBy(Pageable pageable);

Slice<Course> findByLevel(Level level, Pageable pageable);

Pageable request = PageRequest.of(2, 10, Sort.by("title", "id"));
```

Spring Data adds `ORDER BY` and a limit with an offset, here `offset 20 fetch first 10 rows`, to the generated SQL. The return type decides what else it computes:

- `Page<T>` holds the content, the total number of elements and the number of pages. It may need an extra `COUNT` query, which can be costly; Spring Data can skip it when the result size already reveals the total.
- `Slice<T>` fetches one extra row to know whether a next slice exists and runs no count. Use it for "load more" lists that need no total.
- `List<T>` with a `Pageable` limits the rows and computes no metadata.

Spring Data derives the count from the main query, so for a `@Query` with joins or grouping a `Page` may need an explicit `countQuery`. Preserve every filter and join needed to count the same results; a grouped query must count result groups, not the underlying rows.

## Sorting must be stable

A page is only meaningful if the order is. Without `ORDER BY`, the database may return rows in any order. Sorting by a column that has ties, such as the title, still leaves the order of equal rows undefined, so the same row can appear at the end of page 1 and again on page 2, or disappear. End the sort with a unique column, usually the id. This gives deterministic ordering for an unchanged result set; concurrent inserts, deletes or sort-key updates can still shift rows between offset-page requests:

```java
Sort.by("title", "id")
```

Sort properties are entity field names, not column names. By default Spring Data rejects function calls in a `Sort` for `@Query` methods.

## From request parameters to Pageable

Spring Boot auto-configures Spring Data web support, so a controller can declare a `Pageable`:

```java
@GetMapping
public PageResponse<CourseSummary> list(
        @RequestParam(required = false) Level level,
        @PageableDefault(size = 10, sort = {"title", "id"}) Pageable pageable) {
    return service.list(level, pageable);
}
```

`GET /api/courses?page=1&size=10&sort=title,desc` fills it: `page` is zero-based and defaults to 0, `size` defaults to 10 for this controller because of `@PageableDefault` (20 is the framework fallback without that override), and `sort` takes `property,asc|desc`. Two limits matter. The accepted size is capped by `spring.data.web.pageable.max-page-size`, which is 2,000 by default; lower it. And the sort values are plain property names that Spring does not check against your model, so a client can send `sort=password` or a nonexistent field. Check them in the service:

```java
private static final Set<String> SORTABLE = Set.of("id", "title", "level", "createdAt");

private Pageable restricted(Pageable pageable) {
    for (Sort.Order order : pageable.getSort()) {
        if (!SORTABLE.contains(order.getProperty())) {
            throw new IllegalArgumentException("Cannot sort by " + order.getProperty());
        }
    }
    return PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(),
            pageable.getSort().and(Sort.by("id")));
}
```

Add an explicit advice handler that maps this invalid-sort exception to 400, following the domain-error pattern in Error Handling with Problem Details. Without that handler, a generic catch-all would return 500.

## Keyset pagination

Offset pagination makes the database read and discard every row before the offset, so page 5,000 is much slower than page 1. Keyset pagination asks for the rows after the last one already seen, which an index can answer directly. Spring Data supports it with a `Window` and a `ScrollPosition`:

```java
Window<Course> findFirst10ByLevelOrderByTitleAscIdAsc(Level level, ScrollPosition position);

Window<Course> first = repository.findFirst10ByLevelOrderByTitleAscIdAsc(
        Level.BEGINNER, ScrollPosition.keyset());
if (!first.isEmpty() && first.hasNext()) {
    Window<Course> next = repository.findFirst10ByLevelOrderByTitleAscIdAsc(
            Level.BEGINNER, first.positionAt(first.size() - 1));
    // consume the next window
}
```

Spring Data rewrites the condition to `title > ? or (title = ? and id > ?)`, and `hasNext()` says whether more rows exist. The costs: a client can only move forward from one position to the next, the sort keys must be indexed and unique together, and the sort columns should not contain nulls. The documentation notes that keyset queries need a proper index. Use it for feeds and exports, and offsets for screens where users jump to a page number.

## A stable response shape

Do not return `Page` itself. Its implementation class is a Spring Data domain type, and the reference documentation recommends against serializing it directly because its JSON can change. Define your own shape:

```java
public record PageResponse<T>(List<T> content, int page, int size,
                              long totalElements, int totalPages) {

    public static <T> PageResponse<T> from(Page<T> page) {
        return new PageResponse<>(page.getContent(), page.getNumber(), page.getSize(),
                page.getTotalElements(), page.getTotalPages());
    }
}
```

Alternatively, Spring Data's `PagedModel` wraps a `Page` as `content` plus a `page` object, and `spring.data.web.pageable.serialization-mode=via_dto` applies that to every returned `Page`. Module 06 consumes a page shape like this from Angular.

## Common mistakes

- Returning `findAll()` as a `List` from an endpoint, which works until the table grows.
- Sorting only by a column with duplicates, so rows repeat or vanish between pages.
- Accepting any `sort` and `size` from the client without a whitelist and a maximum.
- Using `Page` where a total is never shown, potentially paying for a `COUNT` that the screen does not need.

## In practice

Decide the default size, the maximum size and the sortable fields once per resource, and keep them in the service. Return the same page shape from every list endpoint. For lists that grow without bound, such as events or logs, start with keyset pagination.

## Check yourself

1. What does `Slice` save compared with `Page`?
2. Why must a sort end with a unique column?
3. Why is page 5,000 slower than page 1 with offsets, and how does keyset pagination avoid it?
