Complete a REST resource for projects. A project is `{ id: number, slug: string, name: string }` and `slug` is unique. The starter exports the `projects` array, the `app` and a working `GET /projects`.

| Request | Success | Errors |
| --- | --- | --- |
| `GET /projects/:id` | `200` with the project | `404 { "error": "Project not found" }` |
| `POST /projects` with `{ slug, name }` | `201` with the created project and the header `Location: /projects/<id>` | `409 { "error": "Slug already exists" }` |
| `PATCH /projects/:id` with any of `{ slug, name }` | `200` with the updated project | `404 { "error": "Project not found" }`, `409 { "error": "Slug already exists" }` when another project uses the slug |
| `DELETE /projects/:id` | `204` with an empty body | `404 { "error": "Project not found" }` |

Rules:

1. New ids are one above the highest existing id.
2. `PATCH` changes only `slug` and `name` (an `id` in the body is ignored) and keeping a project's own slug is not a conflict.
3. After `DELETE`, the project is gone from `GET /projects` and `GET /projects/:id`.
4. Restrict `:id` to digits as in the previous lesson.
