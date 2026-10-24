Write two functional interceptors in `app.ts`. `AuthStore`, `RequestLog` and the `SKIP_AUTH` context token are already defined.

1. `authInterceptor: HttpInterceptorFn`
   - reads `inject(AuthStore).token()`;
   - when there is a token **and** `request.context.get(SKIP_AUTH)` is `false`, forwards a **clone** of the request with the header `Authorization: Bearer <token>`;
   - otherwise forwards the request unchanged.
2. `loggingInterceptor: HttpInterceptorFn`
   - when the `HttpResponse` arrives, calls `inject(RequestLog).add('<METHOD> <urlWithParams> <status>')`, e.g. `GET /api/posts?userId=2 200`;
   - when the request fails, logs the same format with the `HttpErrorResponse` status, e.g. `DELETE /api/todos/1 403`.
3. `appConfig` registers them in order: `provideHttpClient(withInterceptors([authInterceptor, loggingInterceptor]))`.
