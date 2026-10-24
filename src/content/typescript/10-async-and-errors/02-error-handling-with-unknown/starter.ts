interface AppConfig {
  host: string;
  port: number;
}

class ConfigError extends Error {
  // TODO: set name to "ConfigError" and accept (message: string, options?: ErrorOptions)
}

function getErrorMessage(error: any): string {
  // TODO: accept unknown and narrow before reading message
  return error.message;
}

function parseConfig(json: string): AppConfig {
  let parsed: any;
  try {
    parsed = JSON.parse(json);
  } catch (error: any) {
    // TODO: throw a ConfigError("Invalid JSON") that keeps the original error as cause
    throw new Error(error.message);
  }
  // TODO: validate that parsed is an object with a numeric port and a string host
  return { host: parsed.host, port: parsed.port };
}
