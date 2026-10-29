# Authorization Middleware

Authentication tells you who is calling. **Authorization** decides, on every request, whether that caller may do this specific thing. Most API breaches are not broken crypto: they are an endpoint that forgot to ask.

## Three questions, three places

| Question | Failure | Where it lives |
| --- | --- | --- |
| Who are you? | `401 Unauthorized` + `WWW-Authenticate` | middleware on the whole API prefix |
| May your role call this route? | `403 Forbidden` | middleware on the route (`requireRole('admin')`) |
| May you touch **this** object? | `403` (or `404` to hide existence) | handler or service, after loading the object |

The middleware chain you built in the HTTP module is how frameworks express the first two. In Hono:

```ts
type AppEnv = { Variables: { user: User } };

const requireAuth = (authenticate: Authenticate) =>
  createMiddleware<AppEnv>(async (c, next) => {
    const match = /^Bearer (\S+)$/i.exec(c.req.header('Authorization') ?? '');
    const user = match ? await authenticate(match[1]) : null;
    if (!user) {
      c.header('WWW-Authenticate', 'Bearer');
      return c.json({ error: 'Unauthorized' }, 401);
    }
    c.set('user', user);
    await next();
  });

const app = new Hono<AppEnv>();
app.use('/api/*', requireAuth(verifySession));
app.get('/api/admin/stats', requireRole('admin'), (c) => c.json(stats()));
```

Returning a response without calling `next()` short-circuits the chain, like an Angular `HttpInterceptor` or a route guard returning `false`. The user travels to handlers through typed context variables, so handlers never parse tokens themselves.

Hono also ships `bearerAuth` (fixed tokens or a `verifyToken` callback) and `jwt` (verifies a JWT and stores the payload as `c.get('jwtPayload')`); Express has `passport` and `express-jwt`. They implement step one only. Roles and ownership are always your code.

## Object-level authorization (BOLA)

```ts
app.delete('/api/posts/:id', async (c) => {
  await posts.delete(Number(c.req.param('id')));
  return c.body(null, 204);
});
```

The route is authenticated, yet any logged-in user can delete any post by changing the id. This is **Broken Object Level Authorization** (also called IDOR), the number one risk in the OWASP API Security Top 10, and it is the bug assistants produce most often, because the code "works" in every demo. The fix is boring and must be everywhere:

```ts
const post = await posts.findById(id);
if (!post) return c.json({ error: 'Post not found' }, 404);
if (post.authorId !== user.id && user.role !== 'admin') return c.json({ error: 'Forbidden' }, 403);
```

Even better, make the query itself scoped: `WHERE id = $1 AND tenant_id = $2` (or Postgres row-level security), so a forgotten check returns nothing instead of someone else's data. For multi-tenant apps, the tenant id comes from the authenticated user, **never** from the request body or URL.

## Designing permissions

- **RBAC** (roles): `admin`, `editor`, `member`. Simple and enough for most apps.
- **Permissions** (`posts:delete`): roles map to permission lists; code checks permissions, not role names, so new roles do not require code changes.
- **ABAC / policies**: rules on attributes ("owner or admin", "same organization", "before publication date"), usually in a policy function or a library (CASL, Casbin, Cerbos, OpenFGA for relationship-based access).

Keep the decision in one place per resource (a `canDeletePost(user, post)` function) so it can be unit tested and reused by every route that deletes posts.

## Pitfalls

- Hiding admin buttons in the frontend and calling it authorization: the API must enforce everything; the UI is a convenience.
- Trusting claims from the client: `role` in the request body, `userId` in the query string, a `X-User-Id` header set by the browser.
- Mounting auth per route instead of on the prefix, so the next route added is public by accident.
- Mass assignment: `PATCH /users/me` with `{ "role": "admin" }` copied straight into the update.
- 403 vs 404: returning 403 for objects the user cannot see confirms they exist; many APIs answer 404 for objects outside the caller's scope.

## When to choose it

Use middleware for authentication and coarse role checks on route groups; use explicit policy functions or scoped queries for object-level rules. Choose RBAC until roles multiply, then move to permissions; reach for a policy engine or relationship-based model (Zanzibar-style) when sharing and organizations make rules data-dependent. Managed providers (Auth0, Clerk, WorkOS) can issue roles and permissions in tokens, but ownership checks always stay in your API.

## Working with AI

Brief the assistant with the permission model in words ("members edit their own posts, admins edit any, everything under `/api` requires a user") and ask for tests that try to access another user's object. Review checklist:

- Authentication is mounted on the prefix; public routes are an explicit, short list.
- Every route that takes an object id loads the object and checks ownership or tenant before reading or changing it.
- User identity, role and tenant come from the verified token or session, never from the request body, query or custom headers.
- 401 and 403 are used correctly; error bodies do not leak whether an object exists when that matters.
- Update endpoints whitelist writable fields (no mass assignment of `role` or `ownerId`).
