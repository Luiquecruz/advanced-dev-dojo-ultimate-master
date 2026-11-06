# Project: Course API

This closing project turns the module into a working Spring Boot REST API for courses: constructor-injected layers, typed configuration, validated records, Problem Details for every error and a generated OpenAPI document. Storage is in memory, because the next module replaces it with a database. You build it locally with JDK 25 and Maven (set up in module 03), and use Spring Boot 4.1, which needs Java 17 or later and runs on Java 25.

You need: Records, Enums and Sealed Types, Collections, Streams and Optional, Exceptions in Depth, Inversion of Control and Dependency Injection, Auto-Configuration and Starters, Configuration and Profiles, REST Controllers, Validation with Jakarta, Error Handling with Problem Details, OpenAPI with springdoc.

## Goal

Create a project named `course-api` with the base package `com.example.courseapi`. Start it with `./mvnw spring-boot:run` and manage courses over HTTP at `/api/courses`. Data lives in memory and resets on restart, and no error ever shows a stack trace.

## Features

- Create a project at start.spring.io: Maven, Java, the latest stable Spring Boot 4.1.x, Jar, Java 25, with the dependencies Spring Web and Validation. Add `springdoc-openapi-starter-webmvc-ui` 3.2.0 to the `pom.xml` yourself.
- A `Level` enum (`BEGINNER`, `INTERMEDIATE`, `ADVANCED`) and records `Course`, `CourseRequest` (title, level, durationHours) and `CourseResponse`.
- `CourseRepository` as an interface with an in-memory implementation, a `CourseService` holding the rules, and a `CourseController`.
- Endpoints: list (optionally filtered by `level`), get, create, replace and delete.
- Validation on `CourseRequest`: a title that is not blank and at most 80 characters, a required level, and a duration from 1 to 200 hours.
- An `@RestControllerAdvice` that returns `application/problem+json` for not found, duplicate title, validation and unexpected errors.
- An OpenAPI document with the title `Course API` and an explicit `operationId` on every operation.

## Acceptance criteria

The criteria use three courses: `Java Basics` (`BEGINNER`, 12 hours), `Spring Boot Core` (`INTERMEDIATE`, 24) and `Advanced Concurrency` (`ADVANCED`, 30), created in that order on a fresh start.

1. Creating `Java Basics` returns 201, a `Location` header ending in `/api/courses/1`, and a body with `id` 1. A title sent as `"  Java Basics "` is stored as `Java Basics`.
2. Creating `JAVA BASICS` after `Java Basics` returns 409 with a `type` ending in `duplicate-course-title`.
3. `GET /api/courses/99` returns 404 with a `type` ending in `course-not-found` and a `courseId` member of 99.
4. Posting `{"title":"","level":null,"durationHours":500}` returns 400 with an `errors` list of exactly three entries, for `title`, `level` and `durationHours`.
5. Posting a body with `"level":"EXPERT"` returns 400, and `GET /api/courses?level=NOPE` returns 400.
6. `GET /api/courses` returns the three courses in creation order, and `?level=ADVANCED` returns only `Advanced Concurrency`.
7. Replacing course 1 with its own title and a new duration returns 200. Replacing it with the title `spring boot core` returns 409. Replacing course 42 returns 404.
8. Deleting course 2 returns 204, after which getting it and deleting it again both return 404.
9. `GET /api/courses/abc` returns 400 and no error body contains `Exception` or `com.example`.
10. `GET /v3/api-docs` lists the operation ids `listCourses`, `getCourse`, `createCourse`, `updateCourse` and `deleteCourse`.

## Suggested steps

1. Generate the project, add springdoc to the `pom.xml`, and check that `./mvnw spring-boot:run` starts on port 8080.
2. Put the code in feature packages: `course` for the records, repository, service and controller, `error` for the advice, `config` for the OpenAPI bean.
3. Write the in-memory repository with a `ConcurrentHashMap<Long, Course>` and an `AtomicLong` for ids. Mark it `@Repository`.
4. Write the service with constructor injection. Strip the title, check duplicates ignoring case, and throw `CourseNotFoundException` or `DuplicateCourseTitleException`. On update, only check for duplicates when the title changed.
5. Write the controller with `@Valid @RequestBody`, `ResponseEntity.created(location)` and `ResponseEntity.noContent()`.
6. Write the advice extending `ResponseEntityExceptionHandler`: two `@ExceptionHandler` methods, an override for `MethodArgumentNotValidException` that adds `errors`, and a last-resort handler with a fixed message.
7. Add `@Operation(operationId = ...)` to each method and an `OpenAPI` bean.
8. Try it, then write one test per criterion with MockMvc, using `@SpringBootTest`, `@AutoConfigureMockMvc` and `@DirtiesContext` so each test starts with empty storage:

```bash
curl -i -X POST localhost:8080/api/courses -H 'Content-Type: application/json' \
  -d '{"title":"Java Basics","level":"BEGINNER","durationHours":12}'
./mvnw test
```

## Stretch goals

- Bind a `CatalogProperties` record for a maximum number of courses, validated at startup, and return 409 with a new problem type when the limit is reached.
- Add `application-prod.yaml` that disables the OpenAPI endpoints, and check with `--spring.profiles.active=prod`.
- Add `@ControllerAdvice` handling for `HandlerMethodValidationException` and a `@Positive` constraint on the id path variable.
- Version the list endpoint with `version = "1"` and `"2+"`, where version 2 adds `durationHours` to a summary.

## Common mistakes

- Putting `CourseApiApplication` in a sub-package so `error` and `course` are not scanned.
- Checking duplicates in the controller or the repository instead of the service.
- Forgetting `@Valid` on the request body, so every invalid course is accepted.
- Returning the `Course` record from the controller, which makes the internal model the public contract.
- Leaving tests dependent on each other. Shared in-memory state makes ids depend on test order, so reset the context per test.

## In practice

This is the shape of a typical service before persistence: thin controller, service with rules, a repository interface, one error handler and a documented contract. Because storage sits behind an interface, module 05 replaces the in-memory class with a database repository and the controller, rules and tests stay as they are.

## Check yourself

1. Which layer rejects a duplicate title, and which layer turns that rejection into a 409?
2. What did each of the validation, the advice and springdoc add to the API without changing the controller's logic?
3. What would you change to move the in-memory repository to a database?
