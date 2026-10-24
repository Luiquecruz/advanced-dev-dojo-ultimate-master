1. Link the input element with a `ref` attribute and `useTemplateRef`.
2. Implement `focus` with optional chaining and `clear` by resetting `query` and reusing `focus`.
3. Call `defineExpose` with both functions.
4. In the parent, put a `ref` on `SearchBox`, read it with `useTemplateRef` and call the exposed methods from two buttons.
