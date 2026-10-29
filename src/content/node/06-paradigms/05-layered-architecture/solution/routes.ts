import { Hono, type Context } from 'hono';
import { ConflictError, NotFoundError, ValidationError } from './errors';
import type { TaskService } from './service';

async function readTitle(c: Context): Promise<string> {
  const body = await c.req.json<{ title?: unknown }>().catch(() => ({ title: undefined }));
  return typeof body.title === 'string' ? body.title : '';
}

export function createTaskRoutes(service: TaskService) {
  const routes = new Hono();
  routes.get('/', async (c) => c.json(await service.list()));
  routes.get('/:id{[0-9]+}', async (c) => c.json(await service.get(Number(c.req.param('id')))));
  routes.post('/', async (c) => c.json(await service.create(await readTitle(c)), 201));
  routes.post('/:id{[0-9]+}/complete', async (c) => c.json(await service.complete(Number(c.req.param('id')))));
  return routes;
}

export function handleError(error: Error, c: Context) {
  if (error instanceof ValidationError) {
    return c.json({ error: error.message }, 400);
  }
  if (error instanceof NotFoundError) {
    return c.json({ error: error.message }, 404);
  }
  if (error instanceof ConflictError) {
    return c.json({ error: error.message }, 409);
  }
  console.error(error);
  return c.json({ error: 'Internal server error' }, 500);
}
