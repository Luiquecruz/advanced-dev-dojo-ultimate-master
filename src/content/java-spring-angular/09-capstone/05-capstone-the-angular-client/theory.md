# Capstone: The Angular Client

This stage builds the browser client with Angular 22: a paged course list, a login page and an administrator form, all talking to the secured API. Server errors become messages next to the inputs, and a guard and an interceptor handle authentication on the client.

You need: Capstone: Requirements and Design, Capstone: The Spring API, Capstone: Security.

## Goal

Create the workspace `course-catalog/client` and implement the list, login and create screens against the running API. Module 06 (Angular with a Spring back end) covers `HttpClient`, `httpResource`, mapping Problem Details to form errors, pagination, guards and CORS; module 07 covers interceptors and guards for security. Keep components small: smart components fetch and decide, presentational ones only render.

## Features

- A list page that reads one page at a time from `/api/courses` with a level filter, previous and next buttons, and loading, empty and error states.
- A login page that stores the token and roles in an in-memory signal store.
- An administrator-only page with a Signal Forms form to create a course.
- An interceptor that adds `Authorization: Bearer ...` to `/api/` calls only, and signs the user out on `401`.
- A guard that sends non-administrators to the login page when signed out, or an access-denied page when signed in without permission.
- A development proxy so the browser talks to one origin.

## Acceptance criteria

With the API running on port 8080 and the fixed data loaded:

1. The list shows `Angular Signals` and `Java Basics` on the first page, `Spring Boot in Practice` after Next, and Next is disabled on the last page.
2. Choosing the level `BEGINNER` shows only `JAVA-101`, and a level with no courses shows an explicit empty message.
3. Stopping the API turns the list into an error message with a Try again button that works once the API is back.
4. Submitting the form with an empty title shows the client message under the title input and sends no request; a description of 2,001 characters passes the client rules, and the server's `400` message appears under the description input, not in a banner.
5. Submitting an existing code shows the `409` detail next to the code input.
6. Opening `/courses/new` before signing in redirects to `/login`; after signing in as the administrator it opens.
7. A request to another origin carries no `Authorization` header, and a request to `/api/` does when signed in; a test proves both.
8. Reloading the page signs the user out, because the token is kept in memory only.

## Suggested steps

1. Create the workspace with the Angular CLI and add `proxy.conf.json`, then start the server with `ng serve --proxy-config proxy.conf.json`:

```json
{ "/api/**": { "target": "http://localhost:8080", "secure": false } }
```

2. Type the API in `course.model.ts`: `Course`, `Page<T>`, `CourseRequest` and `ProblemDetails` with an optional `errors` map from field name to messages.
3. Read the list with a reactive resource. The request is a function of signals, so changing the page or the level refetches by itself, and the resource exposes `isLoading()`, `error()`, `value()` and `reload()`:

```ts
readonly page = signal(0);
readonly level = signal<Level | null>(null);

readonly courses = httpResource<Page<Course>>(() => ({
  url: '/api/courses',
  params: { page: this.page(), size: 2, ...(this.level() ? { level: this.level()! } : {}) },
}));
```

4. Hold authentication in an injectable store with `signal` state and `computed` flags, and write the interceptor and the guard as functions:

```ts
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const token = inject(AuthStore).accessToken();
  if (token === null || !request.url.startsWith('/api/')) {
    return next(request);
  }
  return next(request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthStore);
  const router = inject(Router);
  if (!auth.isAuthenticated()) return router.createUrlTree(['/login']);
  return auth.isAdmin() ? true : router.createUrlTree(['/forbidden']);
};
```

5. Register them: `provideHttpClient(withInterceptors([authInterceptor, unauthorizedInterceptor]))` in the application config and `canActivate: [adminGuard]` on the create route. The second interceptor signs out and navigates on a `401` only for this API (excluding the login request) and when the user was signed in, so a failed login does not loop.
6. Build the form with Signal Forms: a model signal, a schema with `required`, `pattern` and `maxLength`, and `submit()`. When the server answers `409`, attach its `detail` to the code field; when it answers `400`, return its `errors` as field errors, first validating that every map value is a string array and whitelisting known fields. This differs from module 06's array shape. Use generic messages for server failures and let unexpected failures propagate:

```ts
function isFieldErrorMap(value: unknown): value is Record<string, string[]> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) &&
    Object.values(value).every((messages) =>
      Array.isArray(messages) && messages.every((message) => typeof message === 'string'));
}

if (problem.errors !== undefined && !isFieldErrorMap(problem.errors)) {
  return { kind: 'server', message: 'The request could not be saved' };
}
if (error.status === 409) {
  return { fieldTree: field.code, kind: 'server', message: problem.detail ?? 'This code is already in use' };
}
const fields = {
  code: field.code, title: field.title, description: field.description,
  level: field.level, instructorId: field.instructorId,
} as const;
const mapped = Object.entries(problem.errors ?? {}).flatMap(([name, messages]) =>
  Object.hasOwn(fields, name)
    ? messages.map((message) => ({
        fieldTree: fields[name as keyof typeof fields], kind: 'server', message,
      }))
    : [],
);
return mapped.length ? mapped : { kind: 'server', message: 'The request could not be saved' };
```

7. Test the interceptor with `provideHttpClientTesting()` and `HttpTestingController`: sign in with a fake token, call `/api/courses` and another origin, and assert the header on each request.

## Stretch goals

- Add a detail page with its own `httpResource` and a delete button visible to administrators.
- Keep the filter and page in the URL query string so a reload keeps the view.
- Split the list into a smart container and a presentational table component with inputs and outputs.

## Common mistakes

- Treating the guard as security. It improves the interface; the `403` from the API is what protects the data.
- Storing the token in `localStorage` because reloads are annoying. Any script on the page can read it; in-memory storage trades convenience for safety.
- Showing every server error in one banner, so the user cannot tell which field to fix.
- Adding the token to every request, which sends it to third-party hosts.

## In practice

A client of this shape keeps its server knowledge in two places, a typed API layer and the interceptors, so screens stay free of URLs and headers. Signals make the list simple: the page and the filter are state, and the request is derived from them.

## Check yourself

1. Which signals change when the user presses Next, and what refetches the data?
2. Why does the unauthorized interceptor check that the user was signed in before navigating?
3. How does the client know which input a server message belongs to?
