import { Hono, type Context } from 'hono';
import type { TaskService } from './service';

export function createTaskRoutes(service: TaskService) {
  const routes = new Hono();
  routes.get('/', async (c) => c.json(await service.list()));
  // TODO: GET /:id, POST / (201) and POST /:id/complete, delegating every rule to the service
  return routes;
}

export function handleError(error: Error, c: Context) {
  // TODO: map ValidationError to 400, NotFoundError to 404, ConflictError to 409 with { error: message }
  console.error(error);
  return c.json({ error: 'Internal server error' }, 500);
}
