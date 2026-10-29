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
  const port = Number(env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }
  if (!env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }
  return { port, nodeEnv: env.NODE_ENV ?? 'development', databaseUrl: env.DATABASE_URL };
}

export function parseCli(args: string[]): CliOptions {
  const { values } = parseArgs({
    args,
    options: {
      port: { type: 'string', short: 'p' },
      verbose: { type: 'boolean', short: 'v', default: false },
    },
  });
  return { port: values.port, verbose: values.verbose };
}

export function main(args: string[], env: Env): number {
  let cli: CliOptions;
  try {
    cli = parseCli(args);
  } catch (error) {
    console.error(`Usage error: ${(error as Error).message}`);
    return 2;
  }
  try {
    const config = loadConfig(cli.port === undefined ? env : { ...env, PORT: cli.port });
    console.log(`Starting in ${config.nodeEnv} on port ${config.port}`);
    if (cli.verbose) {
      console.log(`Config: port=${config.port} nodeEnv=${config.nodeEnv}`);
    }
    return 0;
  } catch (error) {
    console.error(`Config error: ${(error as Error).message}`);
    return 1;
  }
}

process.exitCode = main(process.argv.slice(2), process.env);
