1. Start from the contract of error-first callbacks: last argument, error first, called once, asynchronously.
2. Build `promisify` as an adapter: a function with rest parameters that creates a promise and passes a callback translating `(error, value)` into `reject(error)` or `resolve(value)`.
3. Write `readJson` as a sequence of early returns: read error, parse error, success. Each path ends in exactly one callback call.
4. Keep the `try` around `JSON.parse` only. Calling the callback inside the `try` would catch errors thrown by the caller's own code and call the callback twice.
5. With `readJsonAsync` in hand, `loadSettings` is ordinary `async` code: `await` the data, spread it over the defaults.
6. Handle exactly the failure you expect (`ENOENT` means "no settings yet") and rethrow everything else, so a corrupted file is reported instead of silently replaced by defaults.
