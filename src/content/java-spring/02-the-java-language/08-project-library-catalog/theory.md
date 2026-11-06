# Project: Library Catalog

This closing project combines the module into a small in-memory library catalog: books with validated data, a sealed result type for lending, collections for storage, streams for queries and custom exceptions for rule violations. You build it locally with the JDK alone (use JDK 25; no Maven or Gradle yet, they arrive in the next module), as several files in one package, and run it with `javac` and `java`.

You need: Classes and Objects, Exceptions and Your First Test, Records, Enums and Sealed Types, Interfaces and Generics, Collections, Streams and Optional, Exceptions in Depth, Packages and Modules.

## Goal

Build a console program in a folder `library-catalog` with sources under `src/library/`, in the package `library`. A `Main` class creates a `Catalog`, adds books, lends and searches them, and prints what happened. Nothing is saved to disk: the catalog lives in memory for one run, and a failed rule never ends the program with a stack trace.

## Features

- A `Book` record with `isbn`, `title`, `author` and `year`. A blank ISBN is rejected, and the title is stripped of surrounding spaces.
- A `Catalog` class that stores books by ISBN and adds a book. Adding an ISBN that already exists throws `DuplicateBookException`.
- `find(isbn)` returns an `Optional<Book>`.
- `loan(isbn)` returns a sealed `LoanResult` with three cases: `Loaned`, `AlreadyLoaned` and `UnknownBook`.
- `searchByTitle(text)` returns the books whose title contains the text, ignoring case, sorted by title.
- `countByAuthor()` returns a map from author to the number of books.
- `Main` prints a readable message for every result with an exhaustive `switch`.

## Acceptance criteria

The criteria use this test data in `Main`: ISBN `"1"` Dune by Herbert (1965), `"2"` Emma by Austen (1815) and `"3"` Persuasion by Austen (1817).

1. After adding three books, `find` returns the book for a known ISBN and an empty `Optional` for an unknown one.
2. Adding a second book with an existing ISBN throws `DuplicateBookException` whose message contains the ISBN, and the first book stays unchanged.
3. `new Book("", "Dune", "Herbert", 1965)` throws `IllegalArgumentException`, and `new Book("1", " Dune ", ...)` stores the title as `Dune`.
4. The first `loan` of an ISBN gives `Loaned`, the second gives `AlreadyLoaned`, and an unknown ISBN gives `UnknownBook`, without any exception.
5. `searchByTitle("e")` finds `Dune`, `Emma` and `Persuasion` in alphabetical order, and `searchByTitle("zzz")` returns an empty list.
6. `countByAuthor()` reports 2 books for an author with two titles.
7. The `switch` that prints a `LoanResult` has no `default` branch.

## Suggested steps

1. Create `src/library/Book.java` with a compact constructor that validates the ISBN and normalizes the title.
2. Create `DuplicateBookException` extending `RuntimeException`, with a message built from the ISBN.
3. Create `LoanResult` as a sealed interface and declare its three cases as records nested inside it, so one file holds the whole result type:

```java
package library;

public sealed interface LoanResult
        permits LoanResult.Loaned, LoanResult.AlreadyLoaned, LoanResult.UnknownBook {
    record Loaned(Book book) implements LoanResult { }
    record AlreadyLoaned(Book book) implements LoanResult { }
    record UnknownBook(String isbn) implements LoanResult { }
}
```

4. In `Catalog`, keep a `Map<String, Book>` for the books and a `Set<String>` for the ISBNs on loan. `putIfAbsent` returns `null` when the key was new, and `Set.add` returns `false` when the element was already present; both help you avoid separate "contains" checks.
5. Implement `find` with `Optional.ofNullable(map.get(isbn))`, and implement `loan` with guard clauses: unknown first, then the set check.
6. Implement `searchByTitle` and `countByAuthor` as stream pipelines over `map.values()`, using `filter`, `sorted(Comparator.comparing(Book::title))`, `toList()` and `Collectors.groupingBy`.
7. In `Main`, write a method `describe(LoanResult result)` that returns a string with a `switch` expression over the three cases.
8. Compile and run from the `library-catalog` folder:

```bash
mkdir -p out
javac --release 25 -d out src/library/*.java
java -cp out library.Main
```

## Stretch goals

- Add an enum `Genre` with a display name, add it to `Book`, and list books by genre.
- Add `returnBook(isbn)` and give it its own sealed result.
- Make `searchByTitle` accept a `Comparator<Book>` so callers choose the order.
- Replace the in-memory map with an interface `BookStore` and one implementation, so a later module can swap it.

## Common mistakes

- Returning `null` from `find` or `loan`. The `Optional` and the sealed result exist so the caller must handle every case.
- Adding a `default` branch to the `LoanResult` switch. A new case would then fall into it silently instead of failing to compile.
- Sorting the list that `toList()` returns, for example with `result.sort(...)`. That list is unmodifiable, so the call throws `UnsupportedOperationException`. Sort inside the pipeline with `sorted(...)`.
- Exposing the internal map from a getter. Callers could change the catalog without its rules; return a copy or a query method instead.

## In practice

The shape is the one real services use: validated value objects, a small API class that owns the state, a result type that makes outcomes explicit, and exceptions only for broken rules. Keeping `Main` thin is what later lets you test `Catalog` alone and replace the storage.

## Check yourself

1. Why is `LoanResult` a sealed interface of records instead of a boolean or an exception?
2. Which collection types did you choose for the books and the loans, and why?
3. What does the compiler do for you when you add a fourth `LoanResult` case?
