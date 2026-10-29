import { createMiddleware } from 'hono/factory';
import { UnauthorizedError } from './errors';

export interface User {
  id: string;
  name: string;
}

export type AppEnv = { Variables: { user: User } };

export function requireUser(tokens: ReadonlyMap<string, User>) {
  return createMiddleware<AppEnv>(async (c, next) => {
    // TODO: read "Authorization: Bearer <token>", throw UnauthorizedError when it is missing or unknown, otherwise c.set('user', user)
    await next();
  });
}
