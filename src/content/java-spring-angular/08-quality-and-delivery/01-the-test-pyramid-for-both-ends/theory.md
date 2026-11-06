# The Test Pyramid for Both Ends

A full-stack application has two code bases that must work together: a Spring Boot API and an Angular client. Tests protect them at different distances. Small, fast tests check one piece in isolation; slower tests check that pieces fit together; a few end-to-end tests check the whole path a user takes. The test pyramid is a way to decide how many of each you write, and this lesson maps its levels onto both ends. The tools named here (JUnit, Mockito, test slices, Testcontainers) are taught in module 03 and the Angular tooling in module 06; this lesson explains where each one fits.

You need: Exceptions and Your First Test (what a test is and how it fails).

## The four levels

From the bottom of the pyramid to the top, tests get slower, broader and more expensive to keep green:

| Level | Spring Boot side | Angular side | Protects |
| --- | --- | --- | --- |
| Unit | Plain JUnit on a service or a record, collaborators mocked or faked | A function, a pipe or a service test without the DOM | Business rules and edge cases |
| Slice | `@WebMvcTest`, `@DataJpaTest` | A component test with `TestBed`, `HttpTestingController` for services | One layer with its framework wiring |
| Integration | `@SpringBootTest` with a real database in a container | A service against a fake HTTP backend | Layers working together |
| End to end | The deployed API | A real browser driving the built client | A user journey |

The shape is a pyramid because each step up costs more. A unit test runs in milliseconds and fails for one reason. An end-to-end test needs a running API, a database, a built client and a browser, and it can fail for any of them. Write many tests at the bottom for rules and edge cases, fewer in the middle for wiring, and a handful at the top for the journeys that must never break, such as signing in and enrolling in a course.

## Unit tests

A unit test needs no framework. Pass the dependencies in, and anything unpredictable, such as the current time, should be a dependency too:

```java
public class Expiry {
    private final Clock clock;

    public Expiry(Clock clock) {
        this.clock = clock;
    }

    public boolean isExpired(Instant expiresAt) {
        return !expiresAt.isAfter(clock.instant());
    }
}
```

A test builds it with `Clock.fixed(...)`, so the result never depends on when the test runs. This is the cheapest protection you have, and constructor injection (module 04) is what makes it possible.

## Slice tests

A slice test starts only the part of the application one layer needs. In Spring Boot 4, `@WebMvcTest` starts the MVC infrastructure and scans controllers, `@ControllerAdvice`, filters and converters, not your services; you replace a service with `@MockitoBean`:

```java
@WebMvcTest(CourseController.class)
class CourseControllerTests {

    @Autowired
    private MockMvcTester mvc;

    @MockitoBean
    private CourseService courseService;

    @Test
    void returnsNotFoundForUnknownCourse() {
        given(courseService.find(99L)).willThrow(new CourseNotFoundException(99L));
        assertThat(mvc.get().uri("/api/courses/99")).hasStatus(404);
    }
}
```

Spring Boot 4 puts the annotation in `org.springframework.boot.webmvc.test.autoconfigure` and the test dependencies in `spring-boot-starter-webmvc-test`. This test assumes the request is authorized to reach the controller. With Spring Security present, import the intended slice policy and provide an authorized test identity. For Project: Secure Course API, preserve its scoped-read policy and use `@WithMockUser(authorities = "SCOPE_courses:read")` with the security test starter. A deliberately public GET policy is another design, but must be explicit; otherwise a 401 or 403 occurs before the expected 404. The test checks routing, status codes, JSON mapping and error handling without a database. On the Angular side, a component test renders one component with `TestBed` and asserts on the DOM; a service test uses `provideHttpClientTesting()` and `HttpTestingController` to answer requests from the test.

## Integration tests

`@SpringBootTest` loads the whole application context. With `webEnvironment = RANDOM_PORT` it starts a real server on a random port, and a `RestTestClient` (added with `@AutoConfigureRestTestClient`) calls it over HTTP. Pair it with a Testcontainers database and `@ServiceConnection` and the test runs your real SQL against a real engine. These tests are slower, so use them for flows that cross layers: a request that validates, saves and reads back.

## End-to-end tests

An end-to-end test drives the built Angular client in a real browser against a running API. Angular's `ng e2e` command runs whichever end-to-end tool you add with `ng add`; Playwright and Cypress are among the options. Keep this level small and focused on journeys; it proves that the contract between the two ends works in practice.

## Contract tests

The API and the client agree on a contract: paths, fields and status codes. When the two are developed apart, a contract test checks one side against the written agreement without starting the other. An OpenAPI document (module 04) can serve as that agreement, and tools such as Spring Cloud Contract generate tests from consumer expectations. The idea matters more than the tool: a change that breaks the contract should fail a fast test, not an end-to-end run.

## Flaky tests

A flaky test passes and fails with no code change. The usual causes are time, shared data, ordering and waiting. Fix the cause instead of rerunning:

- Inject a `Clock` instead of calling `Instant.now()`.
- Give each test its own data, and never depend on test order.
- Wait for a condition, such as an element appearing or a request completing, not for a fixed sleep.
- Keep tests that share a database from sharing rows.

A quarantined flaky test is a test that no longer protects anything, so fix or delete it quickly.

## Common mistakes

- Testing everything through the browser. The suite becomes slow and fragile, and a failure does not say which layer broke; push each rule down to the lowest level that can check it.
- Starting `@SpringBootTest` for a test that needs one controller. Use a slice, which starts faster and fails with a smaller cause.
- Mocking so much that the test only checks the mocks. If every collaborator is replaced, the test proves the wiring of the test, not the behavior.
- Fixing a flaky test with a longer sleep. It hides the race and makes the suite slower.

## In practice

Run unit and slice tests on every commit and integration tests on every pull request. Run the small end-to-end set against the built containers before a release. When a bug reaches production, add the cheapest test that would have caught it, not an end-to-end one.

## Check yourself

1. Which level would you use to check that a validation error becomes a 400 response, and why not the one above it?
2. Why does injecting a `Clock` make a test more reliable?
3. What does a contract test protect that a unit test on each side cannot?
