1. Import `useImperativeHandle` and `useRef`.
2. Create a private `inputRef` and attach it to the `<input>`, so the parent's `ref` no longer receives the DOM node.
3. Call `useImperativeHandle(ref, () => ({ focus, clear }), [])` where each method delegates to `inputRef.current`.
4. The empty dependency array keeps the same handle object across renders, because `inputRef` is stable.
5. `App` now gets `{ focus, clear }` in `searchRef.current`, and its buttons work without knowing anything about the markup.
