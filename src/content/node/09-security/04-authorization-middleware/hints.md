Parse the header with a regular expression: `/^Bearer (\S+)$/i.exec(c.req.header('Authorization') ?? '')`. When it matches, the token is `match[1]`; when it does not, skip `authenticate` and go straight to the 401.
---
A middleware stops the chain by returning a response instead of calling `next()`: `c.header('WWW-Authenticate', 'Bearer'); return c.json({ error: 'Unauthorized' }, 401);`. On success, `c.set('user', user)` and `await next()`.
---
Add `requireRole('admin')` as an extra handler before the stats handler: `app.get('/api/admin/stats', requireRole('admin'), (c) => ...)`. In the delete route, look the post up first (404), then compare `post.authorId !== user.id && user.role !== 'admin'` (403), and finish with `return c.body(null, 204)`.
