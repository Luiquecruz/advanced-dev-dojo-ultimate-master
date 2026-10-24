Parse a raw configuration object safely with assertion functions. Type assertions (`as`) are not allowed.

1. `invariant(condition: unknown, message: string): asserts condition` throws `new Error(message)` when `condition` is falsy.
2. `assertIsString(value: unknown, name: string): asserts value is string` throws `new TypeError('<name> must be a string')` when `value` is not a string.
3. `readConfig(raw: Record<string, unknown>): { host: string; port: number }` uses the two helpers:
   - `host` must be a string (use `assertIsString(raw.host, 'host')`)
   - `port` must be a positive number (use `invariant`, message `"port must be a positive number"`)
   - returns `{ host, port }`

```ts
readConfig({ host: 'localhost', port: 8080 }); // { host: 'localhost', port: 8080 }
readConfig({ host: 42, port: 8080 });          // throws TypeError "host must be a string"
readConfig({ host: 'localhost', port: -1 });   // throws Error "port must be a positive number"
```
