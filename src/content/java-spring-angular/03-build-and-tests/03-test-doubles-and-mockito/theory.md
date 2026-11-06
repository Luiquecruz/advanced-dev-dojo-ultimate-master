# Test Doubles and Mockito

A class under test rarely works alone: it calls a database, sends a message or asks the clock. A unit test replaces those collaborators with test doubles so it runs fast, gives the same result every time and can force failures. This lesson names the kinds of doubles, then shows how Mockito stubs and verifies, how strict stubbing catches test mistakes, and what is better left unmocked.

You need: Interfaces and Generics, Collections, JUnit Jupiter in Depth.

## The collaborators

The examples use the library catalog from module 02, now split so that `Catalog` depends on two interfaces it does not implement:

```java
public interface BookStore {
    boolean addIfAbsent(Book book);
    Optional<Book> findByIsbn(String isbn);
    Collection<Book> findAll();
}

public interface LoanNotifier {
    void bookLoaned(Book book);
}
```

`new Catalog(store, notifier)` receives both through its constructor, which is what makes them replaceable in a test.

## Kinds of test doubles

- A **dummy** is passed but never used, such as a notifier in a test that only reads books.
- A **stub** returns canned answers: whenever asked for ISBN `"1"`, it returns Dune.
- A **fake** is a simple working implementation, such as `InMemoryBookStore` backed by a map.
- A **spy** records how it was used while keeping real behavior.
- A **mock** is checked afterwards: the test asserts that a call happened.

Mockito creates its objects with one API, so people call them all mocks, but you use them as stubs when you set answers and as mocks when you verify calls. Doubles need no library: a lambda is enough for an interface with one method.

```java
List<Book> notified = new ArrayList<>();
LoanNotifier recording = notified::add;
Catalog catalog = new Catalog(new InMemoryBookStore(), recording);
catalog.add(dune);

assertThat(catalog.loan("1")).isEqualTo(new LoanResult.Loaned(dune));
assertThat(notified).containsExactly(dune);
```

## Setting up Mockito

Add `mockito-junit-jupiter` in test scope, which brings `mockito-core`; `spring-boot-starter-test` already includes both. Register the extension and declare mocks as fields. The extension is what initializes the `@Mock` and `@Captor` fields, and Spring Boot 4 no longer does it for you:

```java
@ExtendWith(MockitoExtension.class)
class CatalogNotificationTest {

    private final Book dune = new Book("1", "Dune", "Herbert", 1965);

    @Mock BookStore store;
    @Mock LoanNotifier notifier;
    @Captor ArgumentCaptor<Book> bookCaptor;
}
```

## Stubbing and verifying

`when(call).thenReturn(value)` defines an answer. Void methods use the other form, `doThrow(...).when(mock).method(...)`. `BDDMockito` offers `given(...).willReturn(...)` with the same effect for teams that prefer given, when, then wording.

```java
@Test
void successfulLoanNotifiesOnce() {
    when(store.findByIsbn("1")).thenReturn(Optional.of(dune));
    Catalog catalog = new Catalog(store, notifier);

    catalog.loan("1");

    verify(notifier, times(1)).bookLoaned(dune);
    verifyNoMoreInteractions(notifier);
}

@Test
void notifierFailureSurfaces() {
    when(store.findByIsbn("1")).thenReturn(Optional.of(dune));
    doThrow(new IllegalStateException("mail down")).when(notifier).bookLoaned(any());

    assertThrows(IllegalStateException.class, () -> new Catalog(store, notifier).loan("1"));
}
```

`verify(mock)` means exactly once, `never()` means zero times, and `inOrder(a, b)` checks the sequence across mocks. A mock returns `null`, `0`, `false`, an empty collection or an empty `Optional` for anything not stubbed.

## Matchers and captors

Matchers such as `any()`, `any(Book.class)` and `eq("1")` match arguments loosely. If one argument uses a matcher, every argument of that call must, so write `eq("1")` instead of mixing in a raw value. To inspect what was passed, capture it:

```java
verify(notifier).bookLoaned(bookCaptor.capture());
assertThat(bookCaptor.getValue().title()).isEqualTo("Dune");
```

## Strict stubs

`MockitoExtension` runs with strict stubbing. A stub the test never uses fails with `UnnecessaryStubbingException`, which removes setup that no longer matters. If the code under test calls a stubbed method with different arguments, you get a `PotentialStubbingProblem` that prints both the call and the stubbing, which usually exposes a typo in the test. `lenient().when(...)` switches strictness off for one stub, a last resort for setup shared by many tests.

## What not to mock

- The class under test: you would be testing the mock.
- Value objects such as `Book` and records: construct real ones.
- Collections and other simple types: use a real `List`.
- Types you do not own, such as a vendor client: wrap them in your own interface and mock that.
- Anything with behavior the test depends on, such as a store that must remember saved books: write or reuse a fake.

Time is the classic case. Inject a `java.time.Clock` and pass `Clock.fixed(...)` in tests instead of mocking static calls.

## The Java agent warning

Mockito's default mock maker attaches itself to the running JVM. Since JDK 21 the JVM warns about this and may refuse it in a later release (JEP 451). The Mockito documentation shows how to pass it as an agent through Surefire: the `maven-dependency-plugin` goal `properties` exposes `${org.mockito:mockito-core:jar}`, and the plugin configuration becomes `<argLine>@{argLine} -javaagent:${org.mockito:mockito-core:jar}</argLine>`, with an empty `<argLine/>` property in the POM so the `@{argLine}` placeholder always resolves.

## Common mistakes

- Verifying every call on every mock. The test then breaks on harmless refactoring, so verify only effects that matter, such as the notification.
- Stubbing a method the code never calls. Strict stubs fail the test, so delete the stub.
- Mixing a matcher with a raw value in one call. Mockito rejects it, so use `eq(...)` for the raw one.
- Mocking `Book` or a `List`. Build the real object; it is simpler and more honest.

## In practice

Prefer real objects and fakes, and reach for a mock when a collaborator is slow, nondeterministic or must be observed. Keep one stub-and-verify story per test, and let strict stubs trim dead setup.

## Check yourself

1. What is the difference between a stub and a mock, and which does `verify` imply?
2. Why does strict stubbing fail a test that stubs a method it never uses?
3. Which collaborators of `Catalog` would you replace with a fake instead of a Mockito mock, and why?
