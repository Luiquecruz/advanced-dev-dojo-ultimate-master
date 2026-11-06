# A Typed Client from OpenAPI

Every lesson so far wrote its TypeScript types by hand, which means they can drift away from the Java records on the server. An OpenAPI document closes that gap: the server describes its own endpoints and types, and the client is produced from that description. This lesson explains the document, what a generator produces, and then writes a small typed client by hand so you know exactly what a generated one contains.

You need: Calling the API with HttpClient and httpResource, Problem Details and Form Errors, Pagination and Sorting in Angular.

## What an OpenAPI document contains

OpenAPI is a machine-readable description of an HTTP API, written as JSON or YAML. It lists **paths**, the **operations** on each path, the parameters and request bodies they take, the responses they return and the **schemas** of the JSON involved. Each operation can have an `operationId`, a unique name such as `listCourses`, which generators turn into a method name. An excerpt:

```yaml
paths:
  /courses:
    get:
      operationId: listCourses
      parameters:
        - { name: q, in: query, schema: { type: string } }
        - { name: page, in: query, schema: { type: integer } }
      responses:
        "200":
          content:
            application/json:
              schema: { $ref: "#/components/schemas/CoursePage" }
    post:
      operationId: createCourse
      requestBody:
        content:
          application/json:
            schema: { $ref: "#/components/schemas/CourseInput" }
      responses:
        "201":
          description: Created
```

Because a document describes the contract in one place, it can drive documentation, tests and clients.

## Getting the document from Spring

The springdoc library reads the Spring MVC mappings, the controller method signatures and the types they use, and serves the description at run time. With the starter `org.springdoc:springdoc-openapi-starter-webmvc-ui` on the classpath, the JSON document is at `/v3/api-docs`, the YAML at `/v3/api-docs.yaml` and the Swagger UI page at `/swagger-ui.html`. Module 04 sets this up.

The document is only as accurate as the code it is read from, so the types and annotations on the server decide how precise the client types can be.

## What a generator produces

A generator such as OpenAPI Generator, whose `typescript-angular` generator targets Angular, reads the document and writes TypeScript: one interface per schema, one service with one method per `operationId`, and a configuration for the base URL. Generated code is a build artifact. Teams regenerate it whenever the server contract changes and never edit it by hand, because the next run would overwrite the change.

```
openapi.json  ->  generator  ->  models (Course, CourseInput, Page)
                              ->  CourseApi (listCourses, getCourse, ...)
                              ->  base path configuration
```

Run a generator locally when you build the closing project. Here a hand-written client shows the shape of its output without requiring generated code to follow the explanation.

## The shape of a generated client

Four ideas appear in every generated Angular client, and the hand-written version shows each one:

```ts
export const API_BASE_PATH = new InjectionToken<string>('API_BASE_PATH', { providedIn: 'root', factory: () => '/api' });

@Injectable({ providedIn: 'root' })
export class CourseApi {
  private readonly http = inject(HttpClient);
  private readonly basePath = inject(API_BASE_PATH);

  listCourses(params: ListCoursesParams = {}): Observable<Page<Course>> {
    let httpParams = new HttpParams();
    for (const [name, value] of Object.entries(params)) {
      if (value !== undefined) {
        httpParams = httpParams.set(name, value);
      }
    }
    return this.http.get<Page<Course>>(`${this.basePath}/courses`, { params: httpParams });
  }

  deleteCourse(id: number): Observable<void> {
    return this.http.delete<void>(`${this.basePath}/courses/${id}`);
  }
}
```

- **Types from schemas.** `Course`, `CourseInput` and `Page<T>` mirror the schemas, so a field renamed on the server breaks the build when the client is regenerated.
- **One method per operation**, named after its `operationId`, with the response type taken from the success response.
- **A base-path token**, so the server address is configuration. A test, a staging build or a different deployment provides another value without touching the service.
- **Careful parameters.** Only defined values are sent, through `HttpParams`, which encodes them. `page: 0` is a value, and `undefined` is not sent at all.

A `204 No Content` answer has no body, so the operation returns `Observable<void>`; it still emits once and completes.

## Common mistakes

- Sending `undefined` or dropping `0`. Building parameters with `if (value)` removes `page: 0`, and gluing values into a string sends the text `undefined` for unset ones.
- Hardcoding `/api` in each method. One deployment behind a different path then needs edits in every method instead of one provider.
- Editing generated files to fix a type. The next generation overwrites the fix; correct the server code or the document instead.
- Treating the typed client as validation. It describes what the server promises, but a response is still only checked if you parse it.

## In practice

Teams commit the OpenAPI document or publish it as a build artifact, regenerate the client in a pipeline step and fail the build when the generated output changes without a matching commit. That turns an API change into a visible diff in the front-end repository instead of a surprise in production.

## Check yourself

1. Which part of an OpenAPI operation becomes the method name in a generated client?
2. Why is `page: 0` kept while `page: undefined` is skipped when parameters are built?
3. What does a base-path token make possible that a hardcoded `/api` does not?
