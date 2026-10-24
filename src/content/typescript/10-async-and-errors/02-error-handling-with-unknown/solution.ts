interface AppConfig {
  host: string;
  port: number;
}

class ConfigError extends Error {
  override name = 'ConfigError';

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
  }
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  return 'Unknown error';
}

function parseConfig(json: string): AppConfig {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (error) {
    throw new ConfigError('Invalid JSON', { cause: error });
  }
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('host' in parsed) ||
    !('port' in parsed) ||
    typeof parsed.host !== 'string' ||
    typeof parsed.port !== 'number'
  ) {
    throw new ConfigError('Invalid config shape');
  }
  return { host: parsed.host, port: parsed.port };
}
