The DOM node should stay inside `SearchInput`. Create `const inputRef = useRef(null)` and give it to the `<input>` instead of the parent's `ref`.
---
`useImperativeHandle(ref, () => ({ ... }), [])` decides what the parent sees. Return an object with only the methods you want to expose.
---
`focus() { inputRef.current.focus(); }` and `clear() { inputRef.current.value = ''; }`. The input is uncontrolled, so writing `value` directly is fine.
