// TODO: make this an assertion function that throws new Error(message) when condition is falsy
function invariant(condition: unknown, message: string): void {}

// TODO: assert that value is a string, otherwise throw a TypeError "<name> must be a string"
function assertIsString(value: unknown, name: string): void {}

function readConfig(raw: Record<string, unknown>): { host: string; port: number } {
  // TODO: validate host and port with the helpers instead of assertions
  return { host: raw.host as string, port: raw.port as number };
}
