Finish a small task API split into layers. Files:

| File | Layer | Status |
| --- | --- | --- |
| `repository.ts` | data access: `Task`, `TaskRepository`, `InMemoryTaskRepository` | done |
| `errors.ts` | domain errors: `ValidationError`, `NotFoundError`, `ConflictError` | done |
| `service.ts` | business rules: `TaskService` | **TODO** |
| `routes.ts` | HTTP: `createTaskRoutes(service)`, `handleError(error, c)` | **TODO** |
| `main.ts` | composition root: `createApp(repository)` and the exported `app` (seeded with tasks 1 done and 2 open) | done |

**`service.ts`** (`TaskService`, constructor receives a `TaskRepository`):

- `get(id)` returns the task or throws `NotFoundError('Task <id> not found')`.
- `create(title)` trims the title; empty → `ValidationError('Title is required')`; an **open** task with the same title exists → `ConflictError('A task named "<title>" is already open')`; otherwise returns `repository.create(title)`.
- `complete(id)` → `NotFoundError` as in `get`; already done → `ConflictError('Task <id> is already done')`; otherwise saves and returns the task with `done: true`.
- No HTTP: no import from `hono`, no status codes.

**`routes.ts`** (mounted under `/tasks`):

| Request | Success |
| --- | --- |
| `GET /tasks` | `200` with every task (already done) |
| `GET /tasks/:id` | `200` with the task |
| `POST /tasks` with JSON `{ title }` | `201` with the created task; a missing or non-string `title` counts as `''` |
| `POST /tasks/:id/complete` | `200` with the updated task |

`handleError` maps `ValidationError` → `400`, `NotFoundError` → `404`, `ConflictError` → `409`, all with body `{ error: <message> }` (use `instanceof`). Any other error is logged with `console.error` and answers `500 { error: 'Internal server error' }`. Routes delegate every rule to the service and never import the repository.
