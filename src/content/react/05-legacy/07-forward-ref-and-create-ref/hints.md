`forwardRef` takes a render function with two arguments: `forwardRef(function LegacyInput({ label }, ref) { ... })`. Assign the result to `export const LegacyInput`.
---
In React 19 a function component gets `ref` in its props: destructure `{ label, ref }` and pass it to `<input ref={ref} />`.
---
In the class, declare `inputRef = createRef();`, pass it with `<LegacyInput ref={this.inputRef} ... />`, call `this.inputRef.current.focus()` in `componentDidMount`, and in `clear` set `this.inputRef.current.value = ''` before focusing.
