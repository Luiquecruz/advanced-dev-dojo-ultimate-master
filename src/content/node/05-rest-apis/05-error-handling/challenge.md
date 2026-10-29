Give the accounts API one consistent error shape: `{ "error": string }`. The starter exports the `accounts` array, the domain errors `NotFoundError` and `InsufficientFundsError`, the service functions `getAccount` and `withdraw`, and the `app` with three routes. The service already throws domain errors; the routes do not handle them yet.

1. In `POST /accounts/:id/withdraw`, throw `new HTTPException(400, { message: 'Amount must be positive' })` when `amount` is not a number greater than `0`, before calling the service.
2. Register `app.onError` that answers:

| Error | Status | Body |
| --- | --- | --- |
| `HTTPException` | its `status` | `{ "error": err.message }` |
| `NotFoundError` | `404` | `{ "error": err.message }` (for example `Account 99 not found`) |
| `InsufficientFundsError` | `422` | `{ "error": "Insufficient funds" }` |
| anything else | `500` | `{ "error": "Internal Server Error" }`, and the error is logged with `console.error(err)` |

3. Register `app.notFound` that answers `404 { "error": "Route not found" }`.
4. Do not add `try/catch` to the routes: errors must travel to `onError`.

`GET /reports/daily` always fails with an unexpected error whose message mentions an internal database host: it must never reach the client.
