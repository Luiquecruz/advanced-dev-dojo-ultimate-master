# Layered Architecture

Most backend codebases you will read, generate or review are organized in three layers. Each one answers a different question:

| Layer | Question it answers | Knows about | Never knows about |
| --- | --- | --- | --- |
| **Routes** (controllers, handlers) | How does HTTP map to a use case? | Request, response, status codes, input parsing | SQL, business rules |
| **Service** (use cases, domain) | What is allowed and what happens? | Business rules, domain errors, repository interfaces | HTTP, status codes, SQL |
| **Repository** (data access) | How is data stored and loaded? | Database, ORM, files, external storage | HTTP, business rules |

Dependencies point **one way**: routes → service → repository. A frontend analogy: components (routes) call hooks or stores (service), which call API clients (repository). You would not put `fetch` URLs inside a button component; you should not put SQL inside a route handler.

## One request through the layers

```ts
export class InMemoryTaskRepository implements TaskRepository {
  private readonly tasks = new Map<number, Task>();

  async findById(id: number) {
    return this.tasks.get(id);
  }

  async update(task: Task) {
    this.tasks.set(task.id, task);
    return task;
  }
}

export class TaskService {
  constructor(private readonly tasks: TaskRepository) {}

  async complete(id: number): Promise<Task> {
    const task = await this.tasks.findById(id);
    if (!task) throw new NotFoundError(`Task ${id} not found`);
    if (task.done) throw new ConflictError(`Task ${id} is already done`);
    return this.tasks.update({ ...task, done: true });
  }
}

export function createTaskRoutes(service: TaskService) {
  return new Hono().post('/:id{[0-9]+}/complete', async (c) => c.json(await service.complete(Number(c.req.param('id')))));
}
```

The route converts HTTP into a method call. The service enforces the rule "a done task cannot be completed again" and expresses failure as a **domain error**, not a status code. Something at the edge translates errors into HTTP:

```ts
export function handleError(error: Error, c: Context) {
  if (error instanceof NotFoundError) return c.json({ error: error.message }, 404);
  if (error instanceof ConflictError) return c.json({ error: error.message }, 409);
  console.error(error);
  return c.json({ error: 'Internal server error' }, 500);
}
```

Because the service has no HTTP in it, the same `complete` can run from a CLI, a queue consumer or a test without a server.

## Where does validation go?

Two kinds of validation, two places:

- **Shape** ("is `title` a string?", "is `id` numeric?") belongs at the edge, in routes, usually with a schema (Zod, covered in the REST module).
- **Rules** ("titles of open tasks are unique", "an order ships only when paid") belong in the service, because every entry point must enforce them.

## Organizing files

| Layout | Example | Fits |
| --- | --- | --- |
| By layer | `routes/`, `services/`, `repositories/` | Small apps, tutorials |
| By feature (vertical slices) | `tasks/{routes,service,repository}.ts`, `users/...` | Most real apps: a change touches one folder |

Feature folders scale better and mirror feature-sliced frontends. Inside each feature the three layers stay.

## Pitfalls

- **Pass-through services**: `getTask(id) { return repo.findById(id) }` everywhere. Acceptable for plain CRUD; do not invent rules to justify a layer.
- **HTTP leaking down**: services that receive `c` (the Hono context), throw `HTTPException(404)` or return status codes.
- **Storage leaking up**: routes returning ORM entities directly, exposing internal columns (`passwordHash`, `deletedAt`). Map to response DTOs.
- **Repositories with rules**: `findActiveUnbannedPremiumUsers()` hides business decisions in data access.
- **Transactions**: a use case that updates two repositories needs one transaction, owned by the service (unit of work, persistence module).
- **Shared mutable state** between layers: repositories return copies or immutable records.

## When to choose it

Layers pay off as soon as an API has real business rules, more than one entry point (HTTP plus jobs), or more than one developer. For a ten-endpoint CRUD proxy, a route that calls the repository directly is honest and fine; add a service when the first rule appears. Hexagonal (ports and adapters) and clean architecture are stricter versions of the same idea, covered in the architecture styles lesson. NestJS enforces controllers, providers and modules; with Hono or Express you choose and must keep the discipline yourself.

## Working with AI

Brief assistants with the layer contract explicitly: "routes parse input and map domain errors to HTTP; the service holds rules and throws `NotFoundError`/`ConflictError`; the repository only stores data". When reviewing:

- The service imports nothing from the web framework and never mentions status codes.
- Routes contain no business `if`s beyond input shape checks.
- Repositories contain no rules and return plain data (copies), not framework or ORM objects to the routes.
- One error handler maps every domain error; unknown errors become a 500 without leaking messages or stack traces.
- The composition root (`main.ts`) is the only file that creates concrete repositories.
