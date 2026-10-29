import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { zValidator } from '@hono/zod-validator';
import { AppError, ValidationError } from './errors';
import { requireUser, type AppEnv, type User } from './auth';
import { CreateBookmarkSchema } from './schemas';
import { BookmarkService, type ServiceDependencies } from './service';

export interface AppDependencies extends ServiceDependencies {
  tokens: ReadonlyMap<string, User>;
}

export function createApp(deps: AppDependencies) {
  const service = new BookmarkService(deps);
  const app = new Hono<AppEnv>();

  app.get('/health', (c) => c.json({ status: 'ok' }));

  app.use('/bookmarks', requireUser(deps.tokens));
  app.use('/bookmarks/*', requireUser(deps.tokens));

  app.get('/bookmarks', async (c) => c.json(await service.list(c.get('user').id, c.req.query('tag'))));

  app.post(
    '/bookmarks',
    zValidator('json', CreateBookmarkSchema, (result) => {
      if (!result.success) {
        throw new ValidationError(result.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })));
      }
    }),
    async (c) => {
      const bookmark = await service.create(c.get('user').id, c.req.valid('json'));
      c.header('Location', `/bookmarks/${bookmark.id}`);
      return c.json(bookmark, 201);
    },
  );

  app.get('/bookmarks/:id', async (c) => c.json(await service.get(c.get('user').id, c.req.param('id'))));

  app.delete('/bookmarks/:id', async (c) => {
    await service.delete(c.get('user').id, c.req.param('id'));
    return c.body(null, 204);
  });

  app.notFound((c) => c.json({ error: { code: 'NOT_FOUND', message: 'Route not found' } }, 404));

  app.onError((error, c) => {
    if (error instanceof AppError) {
      return c.json({ error: { code: error.code, message: error.message, ...(error.details ? { details: error.details } : {}) } }, error.status);
    }
    if (error instanceof HTTPException) {
      return c.json({ error: { code: 'BAD_REQUEST', message: error.message } }, error.status);
    }
    console.error(error);
    return c.json({ error: { code: 'INTERNAL', message: 'Internal server error' } }, 500);
  });

  return app;
}
