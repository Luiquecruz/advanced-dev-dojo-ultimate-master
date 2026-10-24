1. Declare `const [count, setCount] = useState(0)` at the top level of the component.
2. Rewrite the handlers to call `setCount` with the next value instead of mutating a variable.
3. Add `disabled={count === 0}` to the `-1` button so the count cannot go below zero.
4. Add a `Reset` button whose handler calls `setCount(0)`.
5. Nothing else is needed for independence: every component instance gets its own state automatically.
