import { z } from 'zod';

export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    DATABASE_URL: z.url(),
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    ENABLE_SIGNUP: z.stringbool().default(false),
    ALLOWED_ORIGINS: z
      .string()
      .default('')
      .transform((value) =>
        value
          .split(',')
          .map((origin) => origin.trim())
          .filter(Boolean),
      ),
    SESSION_SECRET: z.string().min(32).optional(),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === 'production' && !env.SESSION_SECRET) {
      ctx.addIssue({ code: 'custom', path: ['SESSION_SECRET'], message: 'Required in production' });
    }
  });

export type Config = z.infer<typeof envSchema>;

export interface ConfigIssue {
  variable: string;
  message: string;
}

export class ConfigError extends Error {
  name = 'ConfigError';
  issues: ConfigIssue[];

  constructor(issues: ConfigIssue[]) {
    super(`Invalid environment: ${issues.map((issue) => issue.variable).join(', ')}`);
    this.issues = issues;
  }
}

export function loadConfig(env: Record<string, string | undefined> = process.env): Readonly<Config> {
  const result = envSchema.safeParse(env);
  if (!result.success) {
    throw new ConfigError(result.error.issues.map((issue) => ({ variable: String(issue.path[0]), message: issue.message })));
  }
  return Object.freeze(result.data);
}
