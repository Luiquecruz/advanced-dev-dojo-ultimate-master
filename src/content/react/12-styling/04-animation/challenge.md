Build a panel that fades in and out without losing its exit animation. Everything lives in `App.jsx`.

### `usePrefersReducedMotion()` (named export)

- Return `window.matchMedia('(prefers-reduced-motion: reduce)').matches` (use that exact query).
- Stay in sync when the media query changes, using `useSyncExternalStore` and the `change` event.

### `FadePanel({ open, children })` (named export)

Render a single `<div>` containing `children` (the tests find it by its text).

- While `open` is `true`: `data-state="open"` and class `fade-in`.
- When `open` becomes `false`: **keep** the div in the DOM with `data-state="closed"` and class `fade-out`, and remove it only when its `animationend` event fires (`onAnimationEnd`).
- If the user prefers reduced motion, closing removes the div **immediately**.
- If `open` becomes `true` again before the exit finishes, return to the open state.
- If the panel starts with `open={false}`, render nothing.
