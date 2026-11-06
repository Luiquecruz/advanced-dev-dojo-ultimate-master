Write by hand the typed client that a generator would produce from an OpenAPI document. The project has one file, `app.ts`, with the types, the `API_BASE_PATH` token (default `/api`) and the excerpt of the document in a comment. Implement the four methods of `CourseApi`, named after the `operationId` values:

1. `listCourses(params?: ListCoursesParams): Observable<Page<Course>>` sends `GET <basePath>/courses`. Send only the parameters that are defined: `page: 0` is a value and must be sent, `undefined` must not appear in the URL. Let `HttpParams` encode the values, so `{ q: 'a&b' }` produces `q=a%26b`.
2. `getCourse(id: number): Observable<Course>` sends `GET <basePath>/courses/<id>`.
3. `createCourse(input: CourseInput): Observable<Course>` sends `POST <basePath>/courses` with the input as the JSON body.
4. `deleteCourse(id: number): Observable<void>` sends `DELETE <basePath>/courses/<id>`. The `204` response has no body, and the observable still emits once and completes.

Every URL starts with the injected `API_BASE_PATH`, never with a hardcoded `/api`.
