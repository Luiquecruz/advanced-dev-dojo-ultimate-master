1. Read `repository.ts` and `main.ts` first: they define what the service may call and how the layers are wired.
2. Implement `TaskService` with domain language only. Each method follows load → check rule → throw a domain error or delegate to the repository.
3. Reuse `get` inside `complete` so the not-found rule lives in one place.
4. In `routes.ts`, keep handlers thin: extract params and body shape, call one service method, choose the success status (`201` for creation).
5. Let errors propagate: no `try/catch` in handlers. `handleError` is the single translation table from domain errors to HTTP.
6. Keep the unknown-error branch generic: log the real error for operators, return a fixed message to clients so internal details never leak.
