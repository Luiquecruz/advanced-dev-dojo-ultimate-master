Defaults use `=` inside the angle brackets: `type ApiResponse<TData = unknown, TError = ApiError> = ...`.
---
Once `TError` has a default, `success` and `failure` can return `ApiResponse<TData>` instead of repeating `ApiError`.
---
`function failure<TData = never>(...)` and `function createCollection<T = string>(...)`. The failure body is `return { ok: false, error: { code, message } };`.
