## Interceptors

Interceptors are middleware for `HttpClient`. Every request passes through a chain of them before reaching the backend, and every response travels back through the same chain. They are the right place for cross-cutting concerns: auth headers, logging, retries, caching, loading indicators, error normalization.

```
HttpClient → auth → logging → backend (fetch)
           ←      ←         ← response
```

### Modern: functional interceptors

```ts
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const token = inject(AuthStore).token();
  if (!token) {
    return next(request);
  }
  return next(request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};

export const appConfig: ApplicationConfig = {
  providers: [provideHttpClient(withInterceptors([authInterceptor, loggingInterceptor]))],
};
```

- An interceptor is a function `(request, next) => Observable<HttpEvent>`. It runs in an **injection context**, so `inject()` works.
- `HttpRequest` is **immutable**: modify a copy with `clone()` (`setHeaders`, `setParams`, `url`, `body`...).
- Call `next(request)` exactly once to continue the chain, or return your own observable to short-circuit (for example a cached response: `of(new HttpResponse({ body: cached }))`).
- Order matters: requests flow through the array **left to right**, responses **right to left**.

### Working with responses

`next()` returns a stream of `HttpEvent`s (`Sent`, progress events, then the `HttpResponse`). Filter what you need:

```ts
export const loggingInterceptor: HttpInterceptorFn = (request, next) => {
  const log = inject(RequestLog);
  const startedAt = performance.now();
  return next(request).pipe(
    tap({
      next: (event) => {
        if (event instanceof HttpResponse) {
          log.add(`${request.method} ${request.urlWithParams} ${event.status} in ${performance.now() - startedAt}ms`);
        }
      },
      error: (error: HttpErrorResponse) => log.add(`${request.method} ${request.urlWithParams} ${error.status}`),
    }),
  );
};
```

### Per-request options: HttpContext

Some requests must opt out (a login call does not need a token, a health check should not show a spinner). Use a typed context token instead of magic headers:

```ts
export const SKIP_AUTH = new HttpContextToken<boolean>(() => false);

this.http.post('/api/login', body, { context: new HttpContext().set(SKIP_AUTH, true) });

// inside the interceptor
if (request.context.get(SKIP_AUTH)) return next(request);
```

### Legacy: class-based interceptors

```ts
@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private auth: AuthStore) {}
  intercept(req: HttpRequest<unknown>, next: HttpHandler) {
    return next.handle(req.clone({ setHeaders: { Authorization: `Bearer ${this.auth.token()}` } }));
  }
}

providers: [
  provideHttpClient(withInterceptorsFromDi()),
  { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
]
```

Class interceptors still work, but their order depends on provider registration order across modules, which is hard to reason about. Functional interceptors are explicit, tree-shakable and simpler to test. Both can coexist during a migration.

### Pitfalls

- Mutating the request (`request.headers.set(...)` returns a **new** object; the result is lost if you ignore it).
- Sending tokens to third-party hosts: check `request.url` before attaching credentials.
- Injecting `HttpClient` inside an interceptor and calling it synchronously can create a circular dependency; use `next()` or defer the injection.
- Interceptors only apply to `HttpClient`, never to raw `fetch()` calls.
