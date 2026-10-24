1. In `authInterceptor`, read the token and the `SKIP_AUTH` flag; return `next(request)` early when no header is needed.
2. Otherwise return `next(request.clone({ setHeaders: { Authorization: ... } }))`.
3. In `loggingInterceptor`, inject `RequestLog` and pipe `next(request)` through `tap`.
4. In `tap.next`, log when the event is an `HttpResponse`; in `tap.error`, log the error's status.
5. Register both with `withInterceptors([authInterceptor, loggingInterceptor])` in `appConfig`.
