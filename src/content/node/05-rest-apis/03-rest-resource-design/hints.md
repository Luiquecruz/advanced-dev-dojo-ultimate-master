Write two small helpers first: one that finds a project by the string id from `c.req.param('id')`, and one that tells whether a slug is used by a project **other than** a given id. Every route then becomes a few lines.
---
Status and header helpers: `` c.header('Location', `/projects/${project.id}`) `` before `return c.json(project, 201)`, and `return c.body(null, 204)` for the delete. Errors are `return c.json({ error: '...' }, 404)` or `409`.
---
For `PATCH`, look the project up first (404), then check `input.slug !== undefined && slugInUse(input.slug, project.id)` (409), then assign `project.slug = input.slug ?? project.slug` and the same for `name`. For `DELETE`, use `findIndex` and `splice`.
