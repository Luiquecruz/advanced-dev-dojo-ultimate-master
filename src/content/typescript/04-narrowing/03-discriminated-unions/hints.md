An interface cannot be a union. Use `type RequestState = | { status: 'idle' } | { status: 'loading' } | ...`.
---
`switch (state.status)` narrows `state` in every `case`; inside `case 'success'` the compiler knows `state.data` exists.
---
Return from each case: idle and loading are fixed texts, success uses `` `${state.data.length} items: ${state.data.join(', ')}` ``, error uses `` `Error: ${state.error}` ``.
