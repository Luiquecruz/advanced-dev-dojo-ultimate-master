# Project: Tested Library Service

This closing project turns the module 02 library catalog into a Maven project with a real test suite: a suite on the JUnit Jupiter engine, a hand-written fake, Mockito tests for a collaborator, a coverage report and a build you can run with one command. You build it locally. You need JDK 25 and Maven 3.9 or newer from maven.apache.org (check with `mvn -v`); the Maven Wrapper then pins the version for the project.

You need: Project: Library Catalog, Maven and the Project Layout, JUnit Jupiter in Depth, Test Doubles and Mockito, Code Quality and Coverage.

## Goal

Create a folder `library-service` containing a Maven project with the package `library`. Reuse your module 02 classes and make `Catalog` testable: it receives a `BookStore` and a `LoanNotifier` through its constructor. `./mvnw verify` compiles the code, runs every test and writes a JaCoCo report. Nothing is saved to disk and no Spring is involved yet.

## Features

- `pom.xml` with the coordinates `com.example:library-service:1.0.0-SNAPSHOT`, release 25, and JUnit Jupiter, Mockito and AssertJ in test scope.
- A `BookStore` interface (`addIfAbsent`, `findByIsbn`, `findAll`) and an `InMemoryBookStore` fake that implements it.
- A `LoanNotifier` interface with `bookLoaned(Book)`.
- `Catalog(BookStore, LoanNotifier)` with `add`, `find`, `loan`, `searchByTitle` and `countByAuthor`, as in module 02. A successful loan calls the notifier once.
- Tests using the fake (`CatalogTest`), Mockito (`CatalogNotificationTest`) and a parameterized `BookTest`.
- The Maven Wrapper files and a `.gitignore` that excludes `target/`.

## Acceptance criteria

The tests use this data: ISBN `"1"` Dune by Herbert (1965), `"2"` Emma by Austen (1815) and `"3"` Persuasion by Austen (1817).

1. `./mvnw clean verify` ends with `BUILD SUCCESS` and reports at least 12 tests with no failures or errors.
2. `Book` tests cover the blank ISBNs `""`, `" "` and `"   "` in one parameterized test and the stripped title `Dune` from `" Dune "`.
3. Catalog tests with the fake show that `find("1")` returns Dune and `find("9")` is empty, and that adding ISBN `"1"` twice throws `DuplicateBookException` whose message contains `1` while the first book stays.
4. The first `loan("1")` is `Loaned`, the second is `AlreadyLoaned`, and `loan("9")` is `UnknownBook`.
5. `searchByTitle("E")` returns Dune, Emma and Persuasion in that order, and `countByAuthor()` reports 2 for Austen.
6. A Mockito test verifies that the notifier is called once with Dune after the first loan, and never for the second loan or for `"9"`. No test mocks `Book`.
7. After you change `loan` to always return `Loaned`, `./mvnw test` fails; undo the change afterward.
8. `target/site/jacoco/index.html` exists and shows no missed lines for `Catalog`.

## Suggested steps

1. Create `library-service/src/main/java/library` and `src/test/java/library`, and copy in your module 02 classes.
2. Write the `pom.xml`. Importing the JUnit BOM keeps the versions aligned:

```xml
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>org.junit</groupId>
            <artifactId>junit-bom</artifactId>
            <version>6.0.3</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
    </dependencies>
</dependencyManagement>

<dependencies>
    <dependency>
        <groupId>org.junit.jupiter</groupId>
        <artifactId>junit-jupiter</artifactId>
        <scope>test</scope>
    </dependency>
    <dependency>
        <groupId>org.mockito</groupId>
        <artifactId>mockito-junit-jupiter</artifactId>
        <version>5.23.0</version>
        <scope>test</scope>
    </dependency>
    <dependency>
        <groupId>org.assertj</groupId>
        <artifactId>assertj-core</artifactId>
        <version>3.27.7</version>
        <scope>test</scope>
    </dependency>
</dependencies>
```

3. Add the coordinates, the `maven.compiler.release` property and the JaCoCo plugin with `prepare-agent` and a `report` execution bound to `verify`, as in the previous lesson.
4. Extract `BookStore` and `InMemoryBookStore` from the map in `Catalog`, add `LoanNotifier`, and change the constructor to `Catalog(BookStore store, LoanNotifier notifier)`.
5. Run `mvn wrapper:wrapper`, then `./mvnw -v` to confirm the wrapper works.
6. Write `BookTest`, `CatalogTest` with `@BeforeEach` building a catalog on `new InMemoryBookStore()` and a no-op notifier, and group the loan tests in a `@Nested` class.
7. Write `CatalogNotificationTest` with `@ExtendWith(MockitoExtension.class)`, `@Mock BookStore` and `@Mock LoanNotifier`, and verify the calls.
8. Run `./mvnw clean verify`, open the JaCoCo report and fix any missed lines in `Catalog`.

## Stretch goals

- Add a `LateFeeCalculator` that takes a `java.time.Clock`, and test it with `Clock.fixed(...)`.
- Add `-Xlint:all` with `failOnWarning` to the compiler plugin and fix what it reports.
- Add the PIT plugin, run it on `Catalog` and add a test for every surviving mutant.
- Add the Failsafe plugin and move one test to a class named `*IT`.

## Common mistakes

- Putting test classes in `src/main/java`. They are packaged with the application and JUnit is not on that classpath, so move them to `src/test/java`.
- Naming a test class `CatalogCheck`. Surefire only picks up names such as `*Test` and `*Tests`, so Maven reports zero tests and still succeeds.
- Forgetting `<scope>test</scope>` on JUnit and Mockito, which puts them on the production classpath.
- Verifying with Mockito what the fake already shows. Assert on the catalog's results and verify only the notification.

## In practice

A small project with a repeatable build is the unit every later module repeats: a pom that owns the versions, a wrapper, fast tests around the rules, mocks only at the boundaries and a report that shows gaps. Keeping `Catalog` free of storage and messaging details is what lets Spring supply real implementations later.

## Check yourself

1. Why is a hand-written `InMemoryBookStore` a better double for most catalog tests than a Mockito mock?
2. What does `./mvnw clean verify` do that `mvn compile` does not?
3. Which of your tests would fail first if `loan` stopped calling the notifier?
