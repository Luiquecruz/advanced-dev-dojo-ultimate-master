Write a `read(storage)` function: `try { ... } catch { return DEFAULTS; }` around `JSON.parse(storage.getItem('prefs') ?? 'null')`.
---
Branch on `envelope?.version`: for `1` use `data.dark === true`; for `2` validate `theme === 'light' || theme === 'dark'` and `typeof fontSize === 'number'`.
---
A private `persist()` writes `JSON.stringify({ version: 2, data: this.state() })`; call it at the end of both setters.
