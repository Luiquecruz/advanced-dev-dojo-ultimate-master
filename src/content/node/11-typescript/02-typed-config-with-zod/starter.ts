import { z } from 'zod';

export const envSchema = z.object({
  // TODO: NODE_ENV, PORT, DATABASE_URL, LOG_LEVEL, ENABLE_SIGNUP, ALLOWED_ORIGINS, SESSION_SECRET
  // TODO: then a superRefine requiring SESSION_SECRET in production
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
    // TODO: message 'Invalid environment: ' + the variable names joined with ', '
    super('Invalid environment');
    this.issues = issues;
  }
}

export function loadConfig(env: Record<string, string | undefined> = process.env): Readonly<Config> {
  // TODO: safeParse, throw ConfigError with { variable, message } per issue, return a frozen config
  return env as unknown as Config;
}
