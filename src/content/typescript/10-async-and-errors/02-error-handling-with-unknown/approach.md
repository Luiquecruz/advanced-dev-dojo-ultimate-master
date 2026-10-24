1. Give `ConfigError` an `override name` field and a constructor that forwards `message` and `options` to `Error`.
2. Change `getErrorMessage` to accept `unknown` and test, in order: `instanceof Error`, `typeof === 'string'`, object with a string `message`, and finally the fallback.
3. In `parseConfig`, type `parsed` as `unknown` and remove the `: any` annotation from the catch variable.
4. Rethrow parse failures as `ConfigError('Invalid JSON')` with the original error as `cause`.
5. Narrow `parsed` to an object with `host` and `port` using `typeof` and `in`, throwing `ConfigError('Invalid config shape')` when a check fails.
