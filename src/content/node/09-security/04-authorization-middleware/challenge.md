Protect a Hono API with two reusable middlewares and an object-level ownership check. Authentication is injected: `createApp(authenticate)` receives `authenticate(token)`, which resolves with the `User` for a valid token or `null` (in a real app it would verify a JWT or look up a session). The `User`, `Post`, `Authenticate` and `AppEnv` types are given.

## `requireAuth(authenticate)`

A middleware (use `createMiddleware<AppEnv>` from `hono/factory`) that:

1. Reads the `Authorization` header and accepts only `Bearer <token>` (scheme case-insensitive, one space, a non-empty token without spaces).
2. Calls `authenticate(token)` only when there is such a token.
3. When the header is missing or malformed, or `authenticate` resolves with `null`, answers `401` with `{ "error": "Unauthorized" }` and the header `WWW-Authenticate: Bearer`, without calling the next handler.
4. Otherwise stores the user with `c.set('user', user)` and calls `next()`.

## `requireRole(...roles)`

A middleware that runs after `requireAuth`: when `c.get('user').role` is not one of `roles`, it answers `403` with `{ "error": "Forbidden" }`; otherwise it calls `next()`.

## `createApp(authenticate)`

The routes and the post store are in the starter:

| Route | Access | Response |
| --- | --- | --- |
| `GET /health` | public | `200 { "status": "ok" }` |
| every `/api/*` route | `requireAuth` | `401` as above |
| `GET /api/me` | any user | `200` with the user |
| `GET /api/admin/stats` | `requireRole('admin')` | `200 { "posts": <number of posts> }` |
| `DELETE /api/posts/:id` | the post's author or an admin | `204` (empty body) and the post is removed; `404 { "error": "Post not found" }` for an unknown id; `403 { "error": "Forbidden" }` for anyone else |
