# Capstone: The Spring API

This stage builds the HTTP surface of the catalog with Spring Boot 4: endpoints, validation, structured errors and tests, on top of an in-memory store. The database arrives in the next stage, and the layering you choose now is what makes that swap a one-class change.

You need: Capstone: Requirements and Design.

## Goal

Create the Maven project `course-catalog/api` (Java 25, package `com.example.catalog`) that serves the contract from stage one. The store is in memory and seeded with the fixed test data, so the application starts with no database and every endpoint can be called with `curl`. Module 04 (Spring Boot core) is the reference for controllers, validation and error handling, and module 03 for Maven and test slices.

## Features

- `GET /api/courses` with `page` (default 0), `size` (default 20, clamped to 1-100) and optional `level`, sorted by title.
- `GET /api/courses/{id}`, `POST /api/courses` (answers `201` with a `Location` header) and `DELETE /api/courses/{id}` (answers `204`).
- Bean Validation on the request body, a duplicate code answering `409`, an unknown id answering `404`, all as Problem Details.
- Three layers: a controller that only speaks HTTP, a service that applies the rules, and a `CourseStore` interface that hides storage.

## Acceptance criteria

1. Seeded with the fixed data, `GET /api/courses?page=0&size=2` returns `Angular Signals` and `Java Basics` with `totalElements` 3 and `totalPages` 2; page 1 returns `Spring Boot in Practice`.
2. `GET /api/courses?level=BEGINNER` returns only `JAVA-101`.
3. `GET /api/courses/999` answers `404` with a body whose `status` is 404 and whose `title` names the problem.
4. `POST` with an empty title and a malformed code answers `400` and an `errors` object that has both `title` and `code`.
5. `POST` with an existing code answers `409`; a valid `POST` answers `201` with the new course and a `Location` header.
6. `size=5000` is served as size 100 rather than failing.
7. A `@WebMvcTest` proves criterion 4 without starting the full application.

## Suggested steps

1. Generate the project with Maven and these dependencies: `spring-boot-starter-webmvc`, `spring-boot-starter-validation`, `spring-boot-starter-actuator`, and `spring-boot-starter-webmvc-test` in test scope. Springdoc's `springdoc-openapi-starter-webmvc-ui` 3.x is the line built for Spring Boot 4 if you want live documentation.
2. Write the request as a record carrying the constraints, so a bad request never reaches the service:

```java
public record CourseRequest(
        @NotBlank @Size(max = 20) @Pattern(regexp = "[A-Z]+-\\d{3}") String code,
        @NotBlank @Size(max = 120) String title,
        @Size(max = 2000) String description,
        @NotNull Level level,
        @NotNull Long instructorId) { }
```

3. Define `CourseStore` (`list`, `find`, `existsByCode`, `create`, `delete`) and implement it with a `ConcurrentHashMap` seeded in the constructor. Put the paging in the store with `sorted`, `skip` and `limit`, using title then id as a deterministic order. Reject negative page indexes with a 400 and compute offsets as `long` values.
4. Put the rules in `CourseService`: it clamps the page size with `Math.clamp(size, 1, 100)`, throws `DuplicateCodeException` before storing and `CourseNotFoundException` for a missing id.
5. Keep the controller thin: bind, delegate, build the response. Annotate the body parameter with `@Valid`.
6. Map errors in one `@RestControllerAdvice` that extends `ResponseEntityExceptionHandler`, which already turns Spring's own exceptions into Problem Details. Add your exceptions and override the validation handler to attach the field map:

```java
@ExceptionHandler(CourseNotFoundException.class)
ProblemDetail notFound(CourseNotFoundException exception) {
    ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, exception.getMessage());
    problem.setTitle("Course not found");
    return problem;
}

@Override
protected ResponseEntity<Object> handleMethodArgumentNotValid(MethodArgumentNotValidException exception,
        HttpHeaders headers, HttpStatusCode status, WebRequest request) {
    Map<String, List<String>> errors = new LinkedHashMap<>();
    for (FieldError error : exception.getBindingResult().getFieldErrors()) {
        errors.computeIfAbsent(error.getField(), key -> new ArrayList<>()).add(error.getDefaultMessage());
    }
    ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "Validation failed");
    problem.setProperty("errors", errors);
    return handleExceptionInternal(exception, problem, headers, status, request);
}
```

7. Test the controller alone: the slice loads the web layer, and the service is replaced by a mock.

```java
@WebMvcTest(CourseController.class)
class CourseControllerTest {
    @Autowired private MockMvc mvc;
    @MockitoBean private CourseService service;

    @Test
    void rejectsABlankTitleWithAFieldError() throws Exception {
        mvc.perform(post("/api/courses").contentType(MediaType.APPLICATION_JSON)
                .content("{\"code\":\"JAVA-101\",\"title\":\"\",\"level\":\"BEGINNER\",\"instructorId\":1}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.errors.title").isArray());
    }
}
```

In Spring Boot 4 the slice annotation lives in `org.springframework.boot.webmvc.test.autoconfigure`.

## Stretch goals

- Add `PUT /api/courses/{id}` with the same validation and a `404` for an unknown id.
- Return a `Link`-style `next` URL in the page response.
- Publish the OpenAPI document from the running application and diff it against `docs/openapi.yaml`.

## Common mistakes

- Putting rules in the controller, such as the duplicate check, so the next entry point has to copy them.
- Returning entities or store objects directly. The response record is the contract; an internal change must not alter the JSON.
- Catching exceptions inside controller methods and returning ad hoc strings. One advice class gives every error the same shape.
- Rejecting a large `size` with an error when the contract can simply clamp it.

## In practice

A thin controller, a service with the rules and a narrow storage interface is the layout most Spring codebases converge on, because each layer can be tested alone: web slice tests need no storage, service tests need no HTTP, and a real database appears in only one place.

## Check yourself

1. Which behavior in your API would break a client if you renamed a Java field, and how does the response record protect against it?
2. Why does the service, not the controller, throw `DuplicateCodeException`?
3. What does `@MockitoBean` replace in the slice test, and why is that enough to test the validation?
