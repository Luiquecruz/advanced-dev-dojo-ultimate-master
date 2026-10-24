## When requests fail

Networks fail, servers return 500s, resources disappear. A robust app decides, per failure, whether to **retry**, **recover** or **inform the user**. HttpClient reports every failure as an `HttpErrorResponse` in the observable's error channel:

| `status` | Meaning | Typical handling |
| --- | --- | --- |
| `0` | No response: offline, DNS, CORS, aborted | "Check your connection", maybe retry |
| `400`/`422` | Invalid request | show validation messages |
| `401`/`403` | Not authenticated / not allowed | redirect to login (often in an interceptor) |
| `404` | Not found | "not found" state, no retry |
| `5xx` | Server failure, often transient | retry with backoff, then apologize |

`error.error` holds the parsed response body (your API's error payload).

### Catching and mapping

```ts
getUser(id: number) {
  return this.http.get<User>(`/api/users/${id}`).pipe(
    catchError((error: HttpErrorResponse) => throwError(() => toFriendlyError(error))),
  );
}
```

`catchError` must return an observable:

- `throwError(() => new Error('...'))`: keep failing, with a better error for the UI;
- `of(fallback)`: recover with a default value (only if the UI should not know about the failure);
- `EMPTY`: complete silently. Avoid it for resources: they need a value or an error.

Map transport details to domain messages in the **service**, so components only display `error.message`.

### Retrying transient failures

```ts
retry({
  count: 2,
  delay: (error: HttpErrorResponse, retryCount) =>
    error.status >= 500 ? timer(retryCount * 100) : throwError(() => error),
}),
```

- `retry` resubscribes, and because HttpClient observables are cold, that **re-sends** the request.
- `delay` decides per error: return `timer(ms)` to retry after a pause, throw to stop immediately.
- Growing delays (`retryCount * 100`, or exponential `2 ** retryCount * 100` with random jitter) avoid hammering a struggling server.
- Only retry **idempotent** requests (GET, PUT, DELETE). Retrying a POST can create duplicates.
- Operator order: `retry` before `catchError`. The other way around, the error is already converted and nothing is retried.

The older `retryWhen` operator is deprecated in RxJS 7 in favor of `retry({ delay })`.

### Showing errors in the UI

With signal resources, the state machine is built in:

```ts
protected readonly user = rxResource({
  params: () => this.userId(),
  stream: ({ params }) => this.userService.getUser(params),
});
```

```html
@if (user.isLoading()) {
  <p>Loading…</p>
} @else if (user.error(); as error) {
  <p role="alert">{{ error.message }}</p>
  <button (click)="user.reload()">Retry</button>
} @else if (user.hasValue()) {
  <h2>{{ user.value().name }}</h2>
}
```

Reading `value()` while the resource is in the error state **throws**, so check `error()` (or `hasValue()`) first. `role="alert"` makes screen readers announce the message. `httpResource()` behaves the same with an `HttpErrorResponse` in `error()`.

### Where to handle what

- **Interceptor**: cross-cutting reactions (401 → logout and redirect, global toast for 5xx, retry policy for every GET).
- **Service**: map transport errors to domain errors.
- **Component**: render loading, error and empty states and offer a retry.
- **`ErrorHandler`**: report truly unexpected errors to monitoring; `provideBrowserGlobalErrorListeners()` also catches unhandled promise rejections.

### Pitfalls

- Swallowing errors with `catchError(() => of([]))`: the user sees an empty list and thinks there is no data.
- Logging and rethrowing the same error at every layer, producing duplicate reports.
- Forgetting that a subscription with no `error` callback sends the error to the global handler.
