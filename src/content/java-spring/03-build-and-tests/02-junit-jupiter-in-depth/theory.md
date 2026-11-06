# JUnit Jupiter in Depth

You wrote one small test in module 01; this lesson covers the rest of what you use every day: the lifecycle, assertions, grouped and parameterized tests, nested classes, readable names and the AssertJ assertion library. The code under test is a small `LateFeeCalculator` with a fee of 25 cents per day late, capped at 1,000 cents, that rejects negative days.

You need: Exceptions and Your First Test, Interfaces and Generics, Streams and Optional, Maven and the Project Layout.

## Jupiter, JUnit 5 and JUnit 6

JUnit has a platform that runs tests, an engine called Jupiter that understands the annotations in `org.junit.jupiter.api`, and an older Vintage engine for JUnit 4 tests. The Jupiter programming model arrived with JUnit 5 and JUnit 6 keeps it, with Java 17 as the minimum. Spring Boot 4 manages JUnit 6, which is the version the code below was run with. The single dependency `org.junit.jupiter:junit-jupiter` brings the API, the parameterized-test support and the engine.

## Lifecycle

JUnit creates a new instance of the test class for every test method, so instance fields never leak between tests. Lifecycle annotations run around the methods:

```java
class LifecycleTest {

    private int counter = 0;

    @BeforeAll
    static void startOnce() { System.out.println("beforeAll"); }

    @BeforeEach
    void prepare() { System.out.println("beforeEach"); }

    @Test
    void first() { counter++; System.out.println("first, counter=" + counter); }

    @Test
    void second() { counter++; System.out.println("second, counter=" + counter); }

    @AfterEach
    void cleanUp() { System.out.println("afterEach"); }

    @AfterAll
    static void finishOnce() { System.out.println("afterAll"); }
}
```

The output shows `beforeAll` once, then `beforeEach`, a test and `afterEach` for each method, and `afterAll` at the end. Both tests print `counter=1`. Method order is deterministic but deliberately not obvious: when this class was run, `second` came before `first`. Never depend on order. `@BeforeAll` and `@AfterAll` must be `static` unless the class is annotated `@TestInstance(TestInstance.Lifecycle.PER_CLASS)`, which shares one instance among all methods.

## Assertions

`assertEquals(expected, actual)` takes the expected value first. `assertThrows` returns the exception so you can check its message, and `assertAll` runs every assertion and reports all failures together:

```java
@Test
void negativeDaysAreRejected() {
    IllegalArgumentException exception =
            assertThrows(IllegalArgumentException.class, () -> calculator.feeInCents(-3));

    assertEquals("daysLate must not be negative: -3", exception.getMessage());
}

@Test
void feeGrowsPerDayAndStopsAtTheCap() {
    assertAll("fee schedule",
            () -> assertEquals(25, calculator.feeInCents(1)),
            () -> assertEquals(250, calculator.feeInCents(10)),
            () -> assertEquals(1_000, calculator.feeInCents(40)));
}
```

With two wrong expectations, `assertAll` reports `fee schedule (2 failures)` and lists both, where plain assertions would stop at the first. An optional last argument is a failure message, which can be a lambda so it is built only on failure.

## AssertJ

AssertJ is a fluent assertion library: you start with `assertThat(actual)` and chain checks that read like sentences and give detailed failure messages. `spring-boot-starter-test` includes it; in a plain project add `org.assertj:assertj-core` in test scope.

```java
assertThat(catalog.searchByTitle("e")).containsExactly(dune, emma, persuasion);
assertThat(counts).containsEntry("Austen", 2L);
assertThatThrownBy(() -> calculator.feeInCents(-1))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("negative");
```

Collections, maps, optionals and exceptions all have dedicated checks, which is why many teams use it for everything except the simplest comparisons.

## Parameterized tests

One test body can run against many inputs. `@ValueSource` lists single values, `@CsvSource` lists rows and `@MethodSource` names a static method that returns a stream of `Arguments`:

```java
@ParameterizedTest(name = "{0} days late costs {1} cents")
@CsvSource({"0, 0", "1, 25", "39, 975", "40, 1000", "41, 1000"})
void feeSchedule(int daysLate, int expectedCents) {
    assertEquals(expectedCents, calculator.feeInCents(daysLate));
}

static Stream<Arguments> boundaries() {
    return Stream.of(Arguments.of(39, 975), Arguments.of(40, 1_000));
}

@ParameterizedTest
@MethodSource("boundaries")
void capBoundaries(int daysLate, int expectedCents) { /* ... */ }
```

Each row is reported as its own test, so one failing row is easy to find. Choose rows at the boundaries (0, 39, 40, 41), because that is where bugs live.

## Nested tests and names

`@Nested` on a non-static inner class groups tests that share a setup. The outer `@BeforeEach` runs before the inner one, and `@DisplayName` gives the report a readable label:

```java
@Nested
@DisplayName("when the book is overdue")
class WhenOverdue {

    private int fee;

    @BeforeEach
    void calculate() { fee = calculator.feeInCents(10); }

    @Test
    @DisplayName("the fee is 25 cents per day")
    void feeIsPerDay() { assertThat(fee).isEqualTo(250); }
}
```

Name a test after the behavior, not the method: `negativeDaysAreRejected` tells a reader what broke without opening the file. `@DisplayNameGeneration(DisplayNameGenerator.ReplaceUnderscores.class)` turns names such as `fast_check` into readable text. Structure each test as arrange, act, assert, with the three parts visible.

## Disabling and tagging

`@Disabled("reason")` skips a test and shows it as skipped, so it is not forgotten. `@Tag("slow")` labels a test, and Surefire selects by tag: `mvn test -Dgroups=slow` runs only the tagged tests, and `-DexcludedGroups=slow` leaves them out.

## Common mistakes

- Swapping the arguments of `assertEquals`. The test still passes or fails correctly, but the failure message names the wrong value as expected. Always write expected first.
- Letting one test depend on another through a shared field or the run order. Each test must set up its own state.
- Testing only the typical value. Add the boundaries and the invalid input, such as 0, the cap and a negative number.
- Catching an exception in a test and asserting nothing after it. Use `assertThrows`, which fails when nothing is thrown.

## In practice

Keep tests fast, independent and named after behavior. Prefer one reason to fail per test, group related checks with `assertAll` or AssertJ chains, and use parameterized tests when only the data changes. A failing test should explain the problem from its name and message alone.

## Check yourself

1. Why does a field incremented in one test not affect the next test in the same class?
2. When would you choose `assertAll` instead of several separate `assertEquals` calls?
3. Which inputs would you add to a parameterized test for a cap of 1,000 cents reached at 40 days?
