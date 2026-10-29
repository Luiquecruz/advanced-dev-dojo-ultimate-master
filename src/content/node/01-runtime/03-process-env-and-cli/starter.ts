import { parseArgs } from 'node:util';

export type Env = Record<string, string | undefined>;

export interface Config {
  port: number;
  nodeEnv: string;
  databaseUrl: string;
}

export interface CliOptions {
  port?: string;
  verbose: boolean;
}

export function loadConfig(env: Env): Config {
  // TODO: read PORT (default 3000, integer 1-65535), NODE_ENV (default 'development') and the required DATABASE_URL
  return { port: 3000, nodeEnv: 'development', databaseUrl: '' };
}

export function parseCli(args: string[]): CliOptions {
  // TODO: use parseArgs with a string option port (-p) and a boolean option verbose (-v, default false)
  return { verbose: false };
}

export function main(args: string[], env: Env): number {
  // TODO: parse the CLI (usage error: exit code 2), load the config with --port overriding PORT (config error: exit code 1), log the start line and return 0
  return 0;
}

process.exitCode = main(process.argv.slice(2), process.env);
