`promisify` returns `(...args) => new Promise(...)`. Inside the executor, call `fn(...args, callback)` where your callback decides between `reject` and `resolve`.
---
In `readJson`, handle the read error first with `return callback(error)`. Then parse inside a `try` that only wraps `JSON.parse`, and call the success callback **after** the `try/catch`, so an exception thrown by the caller's callback can never trigger a second call.
---
`loadSettings`: `try { const data = await readJsonAsync(path); return { ...DEFAULT_SETTINGS, ...data }; } catch (error) { ... }`. In the `catch`, return `{ ...DEFAULT_SETTINGS }` when `error.code === 'ENOENT'` and `throw error` otherwise.
