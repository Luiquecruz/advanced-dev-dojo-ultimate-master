The config loader was written with `catch (error: any)` and crashes on odd error values. Make it type safe.

1. Complete `ConfigError` so it extends `Error`, has `name` equal to `"ConfigError"` and forwards an optional `ErrorOptions` argument (for `cause`) to `super`.
2. Implement `getErrorMessage(error: unknown): string`:
   - `Error` instances return their `message`
   - strings return themselves
   - objects with a string `message` property return that message
   - anything else returns `"Unknown error"`
3. Fix `parseConfig(json: string): AppConfig`:
   - invalid JSON throws `new ConfigError("Invalid JSON", { cause })` where `cause` is the original `SyntaxError`
   - a parsed value that is not an object with a numeric `port` and a string `host` throws `new ConfigError("Invalid config shape")`
   - valid input returns `{ host, port }`

`any` is not allowed anywhere in the file.
