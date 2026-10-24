function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function assertIsString(value: unknown, name: string): asserts value is string {
  if (typeof value !== 'string') {
    throw new TypeError(`${name} must be a string`);
  }
}

function readConfig(raw: Record<string, unknown>): { host: string; port: number } {
  const { host, port } = raw;
  assertIsString(host, 'host');
  invariant(typeof port === 'number' && port > 0, 'port must be a positive number');
  return { host, port };
}
