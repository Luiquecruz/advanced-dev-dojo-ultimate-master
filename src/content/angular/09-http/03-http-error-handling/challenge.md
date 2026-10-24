Make user loading resilient. The project has two files.

**`user.service.ts`**

1. `toFriendlyError(error: HttpErrorResponse): Error` returns an `Error` with the message:
   - status `0` → `Network error, check your connection`
   - status `404` → `User not found`
   - anything else → `Server error, please try again later`
2. `getUser(id)` requests `GET /api/users/<id>` and:
   - retries with `retry({ count: 2, delay })` **only** when `error.status >= 500`, waiting `retryCount * 100` ms (100 ms, then 200 ms). Any other error is rethrown immediately (no retry);
   - after retries are exhausted, rethrows `toFriendlyError(error)` with `catchError` + `throwError`.

**`app.ts`** (`UserCard`, data loaded with `rxResource`)

3. Add an error branch **before** the `hasValue()` branch: `<p role="alert">` with the error message and a `Retry` button that calls `user.reload()`.
