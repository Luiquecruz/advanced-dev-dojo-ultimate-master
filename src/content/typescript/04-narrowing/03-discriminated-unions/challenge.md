Refactor the request state so impossible states cannot be represented.

1. Replace the `RequestState` interface with a **discriminated union** on `status`:
   - `{ status: 'idle' }`
   - `{ status: 'loading' }`
   - `{ status: 'success'; data: string[] }`
   - `{ status: 'error'; error: string }`
   Objects like `{ status: 'success' }` (no data) or `{ status: 'loading', error: 'x' }` must be type errors.
2. Rewrite `renderState(state: RequestState): string` without non-null assertions (`!`):
   - idle → `"Nothing loaded yet"`
   - loading → `"Loading…"` (with the single `…` character)
   - success → `"<count> items: <a>, <b>"`, e.g. `"2 items: Keyboard, Mouse"`
   - error → `"Error: <message>"`
