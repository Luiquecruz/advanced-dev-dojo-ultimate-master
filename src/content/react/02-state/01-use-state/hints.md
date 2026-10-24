Replace `let count = 0` with `const [count, setCount] = useState(0);`.
---
Never assign to state directly. Call the setter: `setCount(count + 1)`, `setCount(count - 1)` and `setCount(0)` for reset.
---
`disabled` accepts a boolean expression: `<button onClick={...} disabled={count === 0}>-1</button>`. A disabled button ignores clicks, so the count can never become negative.
