The loop happens because `getSnapshot` returns a new array on every call. React must see the same reference when nothing relevant changed, so you need to remember the previous result somewhere that survives renders: a `useRef`.
---
`shallowEqual`: after the `Object.is` check, reject non-objects and `null`, compare `Array.isArray` on both sides, then compare `Object.keys` lengths and every key with `Object.hasOwn(b, key) && Object.is(a[key], b[key])`.
---
Write a `select(snapshot)` helper inside the hook: return `cache.current.selection` when `cache.current.snapshot === snapshot && cache.current.selector === selector`; otherwise compute `next`, swap it for the previous selection when `isEqual` says they match, and store `{ snapshot, selector, selection }`.
---
`return useSyncExternalStore(store.subscribe, () => select(store.getState()), () => select(store.getInitialState()));`
