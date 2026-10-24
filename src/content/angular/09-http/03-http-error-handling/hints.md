`HttpErrorResponse.status` is `0` when the request never got an HTTP answer (offline, DNS, CORS). Map statuses to messages in `toFriendlyError`.
---
`retry({ count, delay })` calls `delay(error, retryCount)` before each retry. Return `timer(ms)` to retry after a pause, or `throwError(() => error)` to stop retrying.
---
Order matters: `retry` must come **before** `catchError` in the pipe, otherwise the friendly error is produced on the first failure and nothing is retried.
---
`@else if (user.error(); as error) { <p role="alert">{{ error.message }}</p> <button (click)="user.reload()">Retry</button> }`. Reading `user.value()` while in error state throws, which is why the error branch comes first.
