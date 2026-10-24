An interceptor is `(request, next) => next(request)`. It runs in an injection context, so `inject(AuthStore)` works at the top of the function.
---
Requests are immutable. Create a modified copy: `request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })`, then pass it to `next()`.
---
`next(request)` returns an Observable of events. Use `tap({ next, error })` and log only when `event instanceof HttpResponse` (other events, like the "sent" event, also pass through).
---
`request.urlWithParams` includes the query string (`/api/posts?userId=2`); `request.method` is uppercase.
