# Streams and Optional

A stream describes a pipeline over a collection: start from a source, transform or filter it, and finish with a result. `Optional` is a return type that says a value may be absent. Both exist to make intent visible, and both can be overused. This lesson covers the pipeline, `map`, `filter`, `collect`, `toList`, `Collectors.groupingBy`, laziness, when a plain loop is clearer, and the right and wrong ways to use `Optional`.

You need: Collections (`List`, `Map`, `Comparator`, method references such as `Integer::sum`), Interfaces and Generics (lambdas), Records, Enums and Sealed Types (records).

## The pipeline

A stream pipeline has a source, zero or more intermediate operations and one terminal operation. The examples use this record and list:

```java
record Book(String title, String author, int year) { }

List<Book> books = List.of(
        new Book("Dune", "Herbert", 1965),
        new Book("Emma", "Austen", 1815),
        new Book("Persuasion", "Austen", 1817));
```

```java
List<String> titles = books.stream()
        .filter(book -> book.year() > 1900)
        .map(Book::title)
        .toList();
```

`stream()` creates the stream, `filter` keeps matching elements, `map` converts each element, and `toList()` ends the pipeline with an unmodifiable `List`. The original `books` list is not changed. Other terminal operations include `count()`, `findFirst()`, `anyMatch(...)`, `forEach(...)` and `collect(...)`. For numbers, `mapToInt(Book::year).sum()` avoids boxing and offers `sum`, `average` and `max`.

## Collecting results

`collect` takes a `Collector`. `Collectors.joining` builds a string, and `Collectors.groupingBy` builds a map:

```java
String joined = books.stream().map(Book::title).collect(Collectors.joining(", "));

Map<String, Long> countByAuthor = books.stream()
        .collect(Collectors.groupingBy(Book::author, Collectors.counting()));

Map<String, List<String>> titlesByAuthor = books.stream()
        .collect(Collectors.groupingBy(Book::author,
                Collectors.mapping(Book::title, Collectors.toList())));
```

For three books by Herbert and Austen, the first map holds `Austen=2` and `Herbert=1`, and the second maps `Austen` to `[Emma, Persuasion]`. Without a downstream collector, `groupingBy` gives a `List` of the elements for each key. The order of keys in the resulting map is not guaranteed.

## Laziness

Intermediate operations do nothing until a terminal operation runs, and elements flow through the whole pipeline one at a time:

```java
Stream<String> lazy = books.stream().map(book -> {
    System.out.println("mapping " + book.title());
    return book.title();
});
System.out.println("built");
lazy.filter(title -> title.startsWith("E")).findFirst();
```

This prints `built`, then `mapping Dune`, `mapping Emma`. Nothing printed while the pipeline was built, and processing stopped at `Emma` because `findFirst` needed only one element. A stream can be consumed once; a second terminal operation on the same stream throws `IllegalStateException` with `stream has already been operated upon or closed`. Keep side effects out of `map` and `filter`; use them only to compute values.

## When a loop is clearer

Streams suit "filter, convert, collect". A loop is clearer when you update several variables, need an index, break out early on a condition, or throw checked exceptions. A pipeline of six chained operations with nested lambdas is harder to read than the loop it replaced. Use a stream when the result reads as a sentence, and a loop when it reads as a procedure.

## Optional

`Optional<T>` is the return type for "a value or nothing", so the caller cannot forget the absent case:

```java
static Optional<Book> findByTitle(List<Book> books, String title) {
    return books.stream().filter(book -> book.title().equals(title)).findFirst();
}

String author = findByTitle(books, "Emma").map(Book::author).orElse("unknown");   // Austen
findByTitle(books, "Dune").ifPresent(book -> System.out.println(book.title()));
Book required = findByTitle(books, "Nope")
        .orElseThrow(() -> new NoSuchElementException("no book Nope"));
```

Use `map` to transform the content, `orElse` for a default, `ifPresent` for an action, and `orElseThrow` when absence is an error with a meaningful message. Calling `get()` on an empty `Optional` throws `NoSuchElementException: No value present`, so calling it without checking is the same bug as an unchecked `null`.

Use `Optional` only as a method return type. Do not use it for fields, method parameters or collection elements; use an empty collection instead of `Optional<List<T>>`. `Optional.ofNullable(value)` wraps a value that may be `null`, while `Optional.of(null)` throws.

## Common mistakes

- Calling `optional.get()` straight after a lookup. It throws `NoSuchElementException` when empty; use `orElseThrow` with a clear message, or `map` and `orElse`.
- Reusing a stream variable for a second terminal operation, which throws `IllegalStateException`. Create a new stream from the source.
- Putting side effects such as printing or adding to an outside list inside `map` or `filter`. Compute values in the pipeline and act on the result.
- Chaining many operations with nested lambdas where a three-line loop would read better.

## In practice

Keep pipelines short and named: extract a predicate or a mapping to a method and pass it with a method reference. Return `Optional` from lookups that may find nothing, and decide at the call site what absence means. Prefer `toList()` over `collect(Collectors.toList())` when you do not need a mutable list.

## Check yourself

1. Why does a stream pipeline with no terminal operation do no work?
2. When is `orElseThrow` a better choice than `orElse`?
3. Where should an `Optional` not be used, and what replaces it?
