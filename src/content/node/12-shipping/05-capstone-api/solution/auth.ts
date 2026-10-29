import { createMiddleware } from 'hono/factory';
import { UnauthorizedError } from './errors';

export interface User {
  id: string;
  name: string;
}

export type AppEnv = { Variables: { user: User } };

export function requireUser(tokens: ReadonlyMap<string, User>) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const match = /^Bearer\s+(\S+)$/.exec(c.req.header('Authorization') ?? '');
    const user = match ? tokens.get(match[1]) : undefined;
    if (!user) {
      throw new UnauthorizedError();
    }
    c.set('user', user);
    await next();
  });
}
