Change every `any` to `unknown` first and let the compiler show you each place that needs narrowing.
---
`ConfigError` needs `override name = 'ConfigError';` and a constructor `(message: string, options?: ErrorOptions)` that calls `super(message, options)`.
---
For objects, chain the checks: `typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string'`. The `in` operator narrows `error` to an object with a `message` property.
---
In `parseConfig`, keep `parsed` as `unknown`, rethrow with `new ConfigError('Invalid JSON', { cause: error })`, then run the same `typeof`/`in` checks for `host` and `port` before returning.
