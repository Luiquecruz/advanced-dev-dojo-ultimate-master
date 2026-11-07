Write a `read(storage)` function: `try { ... } catch { return DEFAULTS; }` around `JSON.parse(storage.getItem('prefs') ?? 'null')`.
---
Branch on `envelope?.version`: for `1` use `data.dark === true`; for `2` validate `theme === 'light' || theme === 'dark'` and `typeof fontSize === 'number'`. Reading is validation too: clamp the stored `fontSize` with `Math.min(24, Math.max(12, fontSize))`.
---
A private `persist()` writes `JSON.stringify({ version: 2, data: this.state() })`; call it at the end of both setters. Wrap the `setItem` call in `try/catch` so a failing storage cannot undo or hide the signal update.
