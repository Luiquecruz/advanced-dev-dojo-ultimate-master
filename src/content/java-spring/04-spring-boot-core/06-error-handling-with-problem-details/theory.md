# Error Handling with Problem Details

A client needs to know three things when a call fails: what went wrong, whether retrying can help, and which field to fix. RFC 9457 defines a standard JSON shape for that, called Problem Details, and Spring has first-class support for it. This lesson covers the format, `ProblemDetail` and `@RestControllerAdvice`, mapping domain exceptions to statuses, shaping validation errors, and keeping internals out of responses. Facts apply to Spring Boot 4 on Spring Framework 7.

You need: REST Controllers (status codes), Validation with Jakarta (the validation exceptions), Exceptions in Depth (custom exceptions).

## The format

A problem response has the media type `application/problem+json` and these standard members:

- `type`: a URI that identifies the kind of problem. It defaults to `about:blank`.
- `title`: a short, stable summary of the kind.
- `status`: the HTTP status code.
- `detail`: an explanation of this occurrence.
- `instance`: a URI for this occurrence, such as the request path.

You may add extension members, such as `courseId` or `errors`. A not-found response from the course API looks like this:

```json
{
  "detail": "No course with id 99",
  "instance": "/api/courses/99",
  "status": 404,
  "title": "Course not found",
  "type": "https://example.com/problems/course-not-found",
  "courseId": 99
}
```

Clients branch on `type` and `status`, never on the text of `detail`.

## One handler for the whole API

Without a handler, exceptions fall through to Boot's `/error` endpoint, whose JSON has a different shape. A `@RestControllerAdvice` class applies to every controller. Extending `ResponseEntityExceptionHandler` makes all Spring MVC exceptions, such as unreadable JSON or a wrong HTTP method, render as problem details too. Returning a `ProblemDetail` from an `@ExceptionHandler` method is enough to produce the response:

```java
@RestControllerAdvice
public class ApiExceptionHandler extends ResponseEntityExceptionHandler {

    @ExceptionHandler(CourseNotFoundException.class)
    ProblemDetail handleNotFound(CourseNotFoundException exception) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, exception.getMessage());
        problem.setTitle("Course not found");
        problem.setType(URI.create("https://example.com/problems/course-not-found"));
        problem.setProperty("courseId", exception.courseId());
        return problem;
    }

    @ExceptionHandler(DuplicateCourseTitleException.class)
    ProblemDetail handleDuplicate(DuplicateCourseTitleException exception) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, exception.getMessage());
        problem.setTitle("Duplicate course title");
        return problem;
    }
}
```

Spring fills `instance` from the request path. Boot also has the property `spring.mvc.problemdetails.enabled` (default `false`), which registers a ready-made handler for the built-in exceptions. When you write your own advice that extends `ResponseEntityExceptionHandler`, leave it off so two handlers do not compete.

The service throws domain exceptions and knows nothing about HTTP; the advice is the only place that maps them to 404 and 409. That keeps the controllers free of `try` blocks.

## Validation errors

Override the method for the validation exception to include field and object-level failures. Import `org.springframework.validation.FieldError`; use an empty `field` for an object-level failure. Body validation and parameter validation have separate exceptions, so override both methods:

```java
@Override
protected ResponseEntity<Object> handleMethodArgumentNotValid(
        MethodArgumentNotValidException exception, HttpHeaders headers,
        HttpStatusCode status, WebRequest request) {
    List<Map<String, String>> errors = exception.getBindingResult().getAllErrors().stream()
            .map(error -> Map.of("field", error instanceof FieldError fieldError ? fieldError.getField() : "",
                                 "message", String.valueOf(error.getDefaultMessage())))
            .toList();
    ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "Validation failed.");
    problem.setTitle("Invalid request");
    problem.setProperty("errors", errors);
    return handleExceptionInternal(exception, problem, headers, status, request);
}
```

The same method shape, overriding `handleHandlerMethodValidationException` and reading `getParameterValidationResults()`, covers constraints on path and query parameters. A class-level constraint on the root request body, such as `@EndsAfterStart`, normally appears under `getGlobalErrors()` when the validator uses the default constraint path. A validator can instead use `addPropertyNode` to attach the violation to a property, producing a field error. A class-level constraint on a nested `@Valid` object can instead appear under `getFieldErrors()` with that object’s path. Reading `getAllErrors()` includes both, even when no individual field constraint fails. A bad body then returns:

```json
{
  "detail": "Validation failed.",
  "instance": "/api/courses",
  "status": 400,
  "title": "Invalid request",
  "errors": [
    { "message": "must not be blank", "field": "title" },
    { "message": "must be less than or equal to 200", "field": "durationHours" }
  ]
}
```

Clients attach known fields to their controls. An empty `field` identifies a global error. Show it, and any path without a matching control, in the form summary alongside field messages. The API contract documents both cases so any consumer can display every failure without dropping object-level messages.

## Never leak internals

Add a last-resort handler for `Exception` that logs the real cause on the server and returns a fixed message:

```java
@ExceptionHandler(Exception.class)
ProblemDetail handleUnexpected(Exception exception) {
    log.error("Unhandled exception", exception);
    ProblemDetail problem = ProblemDetail.forStatusAndDetail(
            HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected error occurred.");
    problem.setTitle("Internal server error");
    return problem;
}
```

Never put a stack trace, an SQL statement, a class name or a file path in `detail`. For Boot's own `/error` output, the properties `spring.web.error.include-message`, `include-stacktrace` and `include-binding-errors` default to `never` and `include-exception` to `false`; leave them that way outside local development. Validation messages and your own domain messages are safe because you wrote them for clients.

## Common mistakes

- Returning `200` with `{"success": false}`. HTTP clients, caches and monitoring read the status; use a real 4xx or 5xx.
- Building `detail` from `exception.getMessage()` for unexpected exceptions. A database or library message can expose table names or paths.
- Handling only `MethodArgumentNotValidException`. A violated constraint on a path variable then escapes as a different, inconsistent response.
- Writing `try`/`catch` in each controller method. Every endpoint then formats errors slightly differently.

## In practice

Keep a short list of problem types for the API, give each a stable URI and document them in the OpenAPI file. The catch-all handler logs the cause with the request path so an operator can find it, while the client sees only a safe message. Tests assert the status, the `application/problem+json` content type and the `type` of each failure.

## Check yourself

1. Which members does an RFC 9457 problem response define, and which one should clients branch on?
2. Where should a `CourseNotFoundException` become a 404?
3. Why does the catch-all handler return a fixed `detail`?
