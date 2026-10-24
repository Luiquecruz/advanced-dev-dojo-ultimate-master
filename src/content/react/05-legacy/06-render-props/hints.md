Start with the hook: `const [on, setOn] = useState(initialOn)` and `const toggle = () => setOn((current) => !current)`.
---
A children-as-a-function component simply returns `children(value)`. Here the value is whatever `useToggle(initialOn)` returns.
---
`MouseTracker` keeps `{ x, y }` in state, updates it in `onMouseMove={(event) => setPosition({ x: event.clientX, y: event.clientY })}` and renders `{render(position)}` inside the div. In `App`, write `<Toggle>{({ on, toggle }) => (<>...</>)}</Toggle>`.
