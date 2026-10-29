Build the bookmarks API end to end. `errors.ts`, `repository.ts` and `main.ts` are done; write `schemas.ts`, `service.ts`, `auth.ts` and `app.ts`.

`main.ts` exports `tokens` (`token-ada` → user `u1` Ada, `token-alan` → user `u2` Alan) and `app = createApp({ repository, ids: randomUUID, now, tokens })`. Every error body uses one envelope: `{ "error": { "code", "message", "details"? } }`.

**`schemas.ts`**: `CreateBookmarkSchema` (Zod) with `url` (http or https only: `z.httpUrl()`), `title` (trimmed, 1–100 characters), `tags` (array of trimmed, lowercased strings of 1–20 characters, at most 5, default `[]`).

**`service.ts`**: `BookmarkService` (constructor receives `{ repository, ids, now }`), no HTTP inside:

- `list(ownerId, tag?)`: the owner's bookmarks in insertion order; with `tag`, only those whose `tags` include it.
- `get(ownerId, id)`: the bookmark, or `NotFoundError` (message `Bookmark not found`) when it is missing **or owned by someone else**.
- `create(ownerId, input)`: `ConflictError('Bookmark already exists for this URL')` when the owner already saved that `url`; otherwise inserts and returns `{ id: ids(), ownerId, url, title, tags, createdAt: now().toISOString() }`.
- `delete(ownerId, id)`: same ownership check as `get`, then deletes.

**`auth.ts`**: `requireUser(tokens)` middleware (`createMiddleware<AppEnv>`). Reads `Authorization: Bearer <token>`; a missing header, another scheme or an unknown token throws `UnauthorizedError` (401, `UNAUTHORIZED`, `Missing or invalid token`); otherwise `c.set('user', user)`.

**`app.ts`**: `createApp(deps)`:

| Request | Auth | Success |
| --- | --- | --- |
| `GET /health` | public | `200 { status: 'ok' }` (already done) |
| `GET /bookmarks?tag=` | bearer | `200` with the user's bookmarks |
| `POST /bookmarks` | bearer | `201`, `Location: /bookmarks/<id>`, the bookmark |
| `GET /bookmarks/:id` | bearer | `200` with the bookmark |
| `DELETE /bookmarks/:id` | bearer | `204` with an empty body |

- Validate the body with `zValidator('json', CreateBookmarkSchema, hook)`; on failure the hook throws `ValidationError(details)` where each detail is `{ path: issue.path.join('.'), message: issue.message }` (400, `VALIDATION_FAILED`, `Invalid request body`).
- `app.notFound` → `404 { error: { code: 'NOT_FOUND', message: 'Route not found' } }`.
- `app.onError`: an `AppError` → its `status` with `{ code, message }` plus `details` when present; an `HTTPException` (for example malformed JSON) → its status with code `BAD_REQUEST` and its message; anything else → `console.error(error)` and `500 { error: { code: 'INTERNAL', message: 'Internal server error' } }`.
