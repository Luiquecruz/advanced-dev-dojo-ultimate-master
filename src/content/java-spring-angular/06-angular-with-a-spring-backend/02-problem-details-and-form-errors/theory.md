# Problem Details and Form Errors

When a request fails, the status code says that something went wrong and the body should say what. Spring can answer with a standard error document, and Angular can read it and put each message next to the field it belongs to. This lesson follows an error from a Spring exception handler to a message under an input in a Signal Forms form.

You need: Calling the API with HttpClient and httpResource, Exceptions in Depth.

## The standard error document

RFC 9457 defines Problem Details for HTTP APIs. It is a JSON object sent with the media type `application/problem+json` and these optional members:

- `type`: a URI that identifies the kind of problem, `about:blank` when the status says everything.
- `title`: a short summary that stays the same for every problem of that type.
- `status`: the HTTP status code repeated in the body.
- `detail`: a sentence about this occurrence.
- `instance`: a URI for this occurrence.

A server may add **extension members**, for example a list of invalid fields. They sit at the top level next to the standard ones, and a client ignores the members it does not know.

```json
{
  "type": "about:blank",
  "title": "Bad Request",
  "status": 400,
  "detail": "Validation failed",
  "errors": [{ "field": "email", "message": "must be a well-formed email address" }]
}
```

The member `errors` is not part of the standard. Its name and shape are a contract between the two teams.

## Producing it in Spring

Spring Framework 7 represents the document with `ProblemDetail`. Returning one from an `@ExceptionHandler` makes Spring send the status stored in it. Its `properties` map is written as top-level JSON members, which is how extension members are added.

```java
@RestControllerAdvice
class ApiExceptionHandler {

    @ExceptionHandler(EmailTakenException.class)
    ProblemDetail handleEmailTaken(EmailTakenException exception) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, exception.getMessage());
        problem.setTitle("Conflict");
        return problem;
    }

    record FieldProblem(String field, String message) { }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ProblemDetail handleValidation(MethodArgumentNotValidException exception) {
        List<FieldProblem> errors = exception.getBindingResult().getFieldErrors().stream()
                .map(error -> new FieldProblem(error.getField(),
                        String.valueOf(error.getDefaultMessage())))
                .toList();
        return validationProblem(errors);
    }

    ProblemDetail validationProblem(List<FieldProblem> errors) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "Validation failed");
        problem.setProperty("errors", errors);
        return problem;
    }
}
```

In Spring Boot the property `spring.mvc.problemdetails.enabled` registers a handler that renders the built-in Spring MVC exceptions this way; the property defaults to `false`. Module 04 builds the full error handling with validation.

## Reading it in Angular

`HttpClient` reports a failure as an `HttpErrorResponse`. Its `status` is the HTTP status, and its `error` property holds the parsed body, which can be a Problem Details object, plain text, `null` or anything else. A type guard checks the shape before the code trusts it:

```ts
export interface ProblemDetail {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  errors?: { field: string; message: string }[];
}

export function isProblemDetail(body: unknown): body is ProblemDetail {
  if (typeof body !== 'object' || body === null) {
    return false;
  }
  const candidate = body as Record<string, unknown>;
  const knownStrings = ['type', 'title', 'detail', 'instance'];
  const stringsValid = knownStrings.every((key) =>
    candidate[key] === undefined || typeof candidate[key] === 'string');
  const statusValid = candidate['status'] === undefined || typeof candidate['status'] === 'number';
  const errors = candidate['errors'];
  const errorsValid = errors === undefined || (Array.isArray(errors) && errors.every((item) =>
    typeof item === 'object' && item !== null &&
    typeof item.field === 'string' && typeof item.message === 'string'));
  return stringsValid && statusValid && errorsValid &&
    (typeof candidate['status'] === 'number' || typeof candidate['title'] === 'string');
}
```

A gateway or proxy in front of Spring can answer with an HTML page or an empty body, so the guard must come before any access to `errors`.

## Showing the messages in a Signal Forms form

`submit()` runs an async action after client validation passes. The example assumes a `form(signal({ name: '', email: '' }))` field tree named `signupForm` and its model signal. The action may return errors, and each error that has a `fieldTree` is attached to that field, where `errors()` shows it like any validation error. An error without a `fieldTree` belongs to the form itself.

```ts
await submit(this.signupForm, async (root) => {
  try {
    await firstValueFrom(this.http.post('/api/users', this.model()));
    return undefined;
  } catch (error) {
    if (!(error instanceof HttpErrorResponse) || error.status >= 500 || !isProblemDetail(error.error)) {
      return { kind: 'server', message: 'Something went wrong, try again' };
    }
    const fields = { name: root.name, email: root.email } as const;
    const fieldErrors = (error.error.errors ?? []).flatMap(({ field, message }) =>
      Object.hasOwn(fields, field) ? [{ fieldTree: fields[field as keyof typeof fields], kind: 'server', message }] : [],
    );
    return fieldErrors.length > 0 ? fieldErrors : { kind: 'server', message: error.error.detail ?? 'Something went wrong, try again' };
  }
});
```

A submission error clears when the user edits the field it is attached to. Validation rules run again on every change, but a server answer is a one-time result.

Mapping through a fixed table of known fields, instead of indexing the form with any string from the server, keeps a bad server value from reaching code that expects a real field.

## Common mistakes

- Assuming every error body is a Problem Details document. A proxy page, a timeout or an empty body makes `error.error` a string or `null`, and reading `errors` from it throws inside the error handler.
- Showing `detail` to the user for every status. For a 500 it can leak internal wording; show a generic message and keep the text for logs.
- Indexing the form with a field name from the server without checking it. An unknown name gives `undefined` and the message disappears.
- Duplicating the rules on the client and the server and letting them drift. The server is the authority, so the client must display whatever it reports.

## In practice

Teams agree on one error shape for the whole API and write the mapping once, in a function that turns a Problem Details body into form errors. Server-side validation stays the source of truth even when the form validates the same rules first, because only the server can know that an email is already registered.

## Check yourself

1. Which `Content-Type` marks a Problem Details body, and where does an extension member such as `errors` appear in it?
2. What does the client check before it reads `errors` from an `HttpErrorResponse`, and why?
3. What happens to a server error attached to the email field when the user edits that field?
