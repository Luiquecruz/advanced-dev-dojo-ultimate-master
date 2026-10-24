1. Implement `toFriendlyError` with the three status cases.
2. In `getUser`, pipe the request through `retry({ count: 2, delay })` where `delay` returns `timer(retryCount * 100)` for `status >= 500` and `throwError(() => error)` otherwise.
3. Add `catchError((error) => throwError(() => toFriendlyError(error)))` after `retry`.
4. In `UserCard`, add the `user.error()` branch with the alert paragraph and the `Retry` button bound to `user.reload()`.
5. Check the flows: transient 503s recover, 404 fails fast, the button retries a failed resource.
