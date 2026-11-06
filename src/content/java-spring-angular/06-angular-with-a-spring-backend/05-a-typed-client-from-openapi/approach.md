1. Inject `HttpClient` and the `API_BASE_PATH` token. A generated client does the same: the server address is configuration, not code.
2. Implement `getCourse`, `createCourse` and `deleteCourse` first. Each is one typed `http` call built from the base path; the generic describes the response in the OpenAPI document (`Course`, `Course`, no content).
3. For `listCourses`, start from an empty `HttpParams` and add each defined entry with `set`. The check `value !== undefined` keeps `page: 0` and drops parameters nobody set.
4. Pass the `HttpParams` through the `params` option. Angular then encodes `a&b` as `a%26b`, which a hand-built query string would have broken by splitting the value at the ampersand.
5. Run the tests. The base-path test provides a different token value and expects all four methods to follow it, which proves no URL starts with a literal `/api`.
6. Compare your methods with a generator's output: the same pieces appear (types from the schemas, one method per `operationId`, a base-path token), only more of them and with more options.
