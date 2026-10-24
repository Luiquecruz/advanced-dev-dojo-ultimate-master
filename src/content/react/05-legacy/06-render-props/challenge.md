Build the same toggle logic both ways, plus a classic render-prop tracker.

1. **`export function useToggle(initialOn = false)`** returns `{ on, toggle }`. `toggle` flips `on`.
2. **`export function Toggle({ initialOn = false, children })`** uses **children as a function**: it calls `children({ on, toggle })` and renders the result. Implement it on top of `useToggle`.
3. **`export function MouseTracker({ render })`** renders a `<div data-testid="tracker">` that stores the pointer position from `onMouseMove` (`event.clientX`, `event.clientY`), starting at `{ x: 0, y: 0 }`, and renders `render({ x, y })` inside the div.
4. **`export default function App()`** uses `<Toggle>` to render a button labeled **`Show details`** (when off) or **`Hide details`** (when on) that toggles, and, only when on, a `<p>` with `Render props share logic.`
