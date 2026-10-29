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

  // TODO: protect /bookmarks and /bookmarks/* with requireUser(deps.tokens)
  // TODO: GET /bookmarks (?tag=), POST /bookmarks (zValidator + 201 + Location), GET /bookmarks/:id, DELETE /bookmarks/:id (204)
  // TODO: app.notFound and app.onError producing { error: { code, message, details? } }

  return app;
}
