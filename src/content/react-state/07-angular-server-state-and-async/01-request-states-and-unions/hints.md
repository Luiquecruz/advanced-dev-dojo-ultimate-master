Keep `private readonly current = signal<RequestState<string[]>>({ status: 'idle' })` and expose `readonly state = this.current.asReadonly()`.
---
Inside `load()` return early when `this.current().status === 'loading'`, set `loading`, then wrap `await this.loader()` in `try/catch`.
---
`names` narrows on `status`: `const state = this.state(); return state.status === 'success' ? state.data : [];`
